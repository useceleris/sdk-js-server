import {
  createClient,
  type Channel,
  type ChannelError,
  type Client,
  type CredentialRequest,
  type MessageMetadata,
  type PresenceEvent,
  type Segment,
  type ServerNotice,
} from "@useceleris/client";
import type { SigningClaims } from "../../../src/claims";
import { createCredentialProvider } from "../../../src/credential-provider";
import { createSigner } from "../../../src/signer";

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy the three CELERIS_* values into a local ` +
        `.env (gitignored): CELERIS_WS_URL, CELERIS_CLIENT_ID and ` +
        `CELERIS_SIGNING_SECRET. Any stack works — change the URL and ` +
        `credentials to point elsewhere.`,
    );
  }

  return value;
} // end function requireEnvironment

export const websocketUrl = () => requireEnvironment("CELERIS_WS_URL");
export const clientId = () => requireEnvironment("CELERIS_CLIENT_ID");
export const signingSecret = () => requireEnvironment("CELERIS_SIGNING_SECRET");

let channelCounter = 0;
export function uniqueChannelReference(label: string): string {
  channelCounter += 1;

  return `jsqual-server-${label}-${Date.now()}-${channelCounter}`;
} // end function uniqueChannelReference

export type QualificationOptions = {
  readonly clientId?: string;
  readonly signingSecret?: string;
  readonly clock?: () => number;
};

// Every live connection exercises the real S4 pipeline: server signer →
// createCredentialProvider → client credential provider.
export function qualificationClient(
  claims:
    | SigningClaims
    | ((request: CredentialRequest) => SigningClaims | Promise<SigningClaims>),
  options: QualificationOptions = {},
): Client {
  const signer = createSigner({
    clientId: options.clientId ?? clientId(),
    signingSecret: options.signingSecret ?? signingSecret(),
    ...(options.clock ? { clock: options.clock } : {}),
  });

  return createClient({
    baseUrl: websocketUrl(),
    allowInsecureLoopback: true,
    credentialProvider: createCredentialProvider({
      signer,
      claims: typeof claims === "function" ? claims : () => claims,
    }),
  });
} // end function qualificationClient

export function allPermissionClaims(reference: string): SigningClaims {
  return {
    channels: { kind: "restricted", references: [reference] },
    permissions: { kind: "all", read: true, write: true },
  };
} // end function allPermissionClaims

export async function connectedChannel(
  reference: string,
  claims:
    | SigningClaims
    | ((request: CredentialRequest) => SigningClaims | Promise<SigningClaims>),
  options: QualificationOptions = {},
): Promise<Channel> {
  const channel = qualificationClient(claims, options).channel(reference);
  await channel.connect();

  return channel;
} // end function connectedChannel

export function waitFor<T>(
  register: (deliver: (value: T) => void) => () => void,
  predicate: (value: T) => boolean,
  timeoutMs = 15_000,
  description = "expected event",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      dispose();
      reject(new Error(`Timed out waiting for ${description}.`));
    }, timeoutMs);
    const dispose = register((value) => {
      if (!predicate(value)) return;
      clearTimeout(timer);
      dispose();
      resolve(value);
    });
  });
} // end function waitFor

// The listener yields (payload, metadata); tests read one object.
export type DeliveredMessage = MessageMetadata & {
  readonly payload: Uint8Array;
};

export function nextMessage(
  segment: Segment,
  predicate: (message: DeliveredMessage) => boolean,
  description = "a message delivery",
  timeoutMs = 15_000,
): Promise<DeliveredMessage> {
  return waitFor<DeliveredMessage>(
    (deliver) =>
      segment.onMessage((payload, metadata) =>
        deliver({ payload, ...metadata }),
      ),
    predicate,
    timeoutMs,
    description,
  );
} // end function nextMessage

export function nextError(
  channel: Channel,
  predicate: (error: ChannelError) => boolean,
  description = "a channel error",
  timeoutMs = 15_000,
): Promise<ChannelError> {
  return waitFor<ChannelError>(
    (deliver) => channel.events().onError(deliver),
    predicate,
    timeoutMs,
    description,
  );
} // end function nextError

export function nextPresence(
  segment: Segment,
  predicate: (event: PresenceEvent) => boolean,
  description = "a presence notification",
  timeoutMs = 15_000,
): Promise<PresenceEvent> {
  return waitFor<PresenceEvent>(
    (deliver) => segment.onPresence(deliver),
    predicate,
    timeoutMs,
    description,
  );
} // end function nextPresence

export function nextNotice(
  channel: Channel,
  predicate: (notice: ServerNotice) => boolean,
  description = "a server notice",
  timeoutMs = 15_000,
): Promise<ServerNotice> {
  return waitFor<ServerNotice>(
    (deliver) => channel.events().onNotice(deliver),
    predicate,
    timeoutMs,
    description,
  );
} // end function nextNotice
