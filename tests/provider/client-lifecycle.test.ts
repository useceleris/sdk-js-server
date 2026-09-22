import { afterEach, beforeEach, expect, test, vi } from "vitest";
// The realtime client resolves through the npm-link symlink to the built
// sibling checkout (see README — Development). These tests drive the real
// client against the real provider: the client requests credentials before
// constructing any WebSocket, so a gated claims callback needs no server.
import {
  createClient,
  ConnectionError,
  type ChannelState,
  type CredentialProvider,
  type CredentialRequest,
} from "@useceleris/client";
import type { SigningClaims } from "../../src/claims";
import { createCredentialProvider } from "../../src/credential-provider";
import { createSigner } from "../../src/signer";

const signerOptions = {
  clientId: "client-1",
  signingSecret: "synthetic-signing-secret-marker",
  clock: () => 1_700_000_000_000,
};

const restrictedClaims: SigningClaims = {
  channels: { kind: "restricted", references: ["room-1"] },
  permissions: {
    kind: "restricted",
    segments: [{ segmentId: "chat", read: true, write: false }],
  },
};

class CountingWebSocket {
  static constructed = 0;
  constructor() {
    CountingWebSocket.constructed += 1;
  }
  addEventListener(): void {}
  removeEventListener(): void {}
  close(): void {}
  send(): void {}
}

beforeEach(() => {
  CountingWebSocket.constructed = 0;
  vi.stubGlobal("WebSocket", CountingWebSocket);
});

afterEach(() => vi.unstubAllGlobals());

function createChannelHarness(
  claims: (
    request: CredentialRequest,
  ) => SigningClaims | Promise<SigningClaims>,
) {
  const realSigner = createSigner(signerOptions);
  let signCalls = 0;
  const provider = createCredentialProvider({
    signer: {
      sign: (value: SigningClaims) => {
        signCalls += 1;
        return realSigner.sign(value);
      },
    },
    claims,
  });

  // Wrapping only to observe when the provider settles: the post-claims
  // path is microtask-only, so awaiting this needs no timers.
  let settled: Promise<void> = Promise.resolve();
  const credentialProvider: CredentialProvider = (request) => {
    const call = provider(request);
    settled = call.then(
      () => undefined,
      () => undefined,
    );
    return call;
  };

  const channel = createClient({
    baseUrl: "wss://example.invalid",
    connectTimeoutMs: 1_000,
    credentialProvider,
  }).channel("room-1");
  const states: ChannelState[] = [];
  channel.events().onStateChange((state) => states.push(state));

  return {
    channel,
    states,
    countSigns: () => signCalls,
    providerSettled: () => settled,
  };
}

function gatedClaims() {
  let releaseClaims!: (claims: SigningClaims) => void;
  let signalStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  const claims = (): Promise<SigningClaims> =>
    new Promise<SigningClaims>((resolve) => {
      signalStarted();
      releaseClaims = resolve;
    });

  return { claims, started, release: () => releaseClaims(restrictedClaims) };
}

test("close during pending claims cancels and suppresses late completion", async () => {
  const gate = gatedClaims();
  const harness = createChannelHarness(gate.claims);

  const pending = harness.channel.connect();
  const rejection = expect(pending).rejects.toMatchObject({
    code: "Cancelled",
  });
  await gate.started;
  await harness.channel.close();
  await rejection;
  expect(harness.states).toEqual(["connecting", "closing", "closed"]);

  gate.release();
  await harness.providerSettled();
  await Promise.resolve();

  expect(CountingWebSocket.constructed).toBe(0);
  expect(harness.countSigns()).toBe(0);
  expect(harness.channel.state).toBe("closed");
  expect(harness.states).toEqual(["connecting", "closing", "closed"]);
});

test("caller abort during pending claims fails without a late socket", async () => {
  const gate = gatedClaims();
  const harness = createChannelHarness(gate.claims);
  const controller = new AbortController();

  const pending = harness.channel.connect({ signal: controller.signal });
  const rejection = expect(pending).rejects.toMatchObject({
    code: "Cancelled",
  });
  await gate.started;
  controller.abort();
  await rejection;
  expect(harness.channel.state).toBe("failed");

  gate.release();
  await harness.providerSettled();
  await Promise.resolve();

  expect(CountingWebSocket.constructed).toBe(0);
  expect(harness.countSigns()).toBe(0);
  expect(harness.states).toEqual(["connecting", "failed"]);
});

test("a claims failure surfaces only the fixed safe error", async () => {
  const harness = createChannelHarness(() => {
    throw new Error(
      `synthetic-claims-failure ${signerOptions.signingSecret} synthetic-reason-marker`,
    );
  });

  const error = await harness.channel
    .connect()
    .then(() => undefined)
    .catch((failure: unknown) => failure);

  expect(error).toBeInstanceOf(ConnectionError);
  expect(error).toMatchObject({
    code: "Transport",
    message: "Credential acquisition failed.",
  });
  expect((error as Error).cause).toBeUndefined();
  const serialized = JSON.stringify(
    error,
    Object.getOwnPropertyNames(error as object),
  );
  expect(serialized).not.toContain(signerOptions.signingSecret);
  expect(serialized).not.toContain("synthetic-reason-marker");
  expect(harness.channel.state).toBe("failed");
  expect(CountingWebSocket.constructed).toBe(0);
});
