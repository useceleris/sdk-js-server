import {
  createCredentialProvider,
  createSigner,
  type CredentialRequest,
} from "@useceleris/server";

// Deterministic packed-artifact exercise of the S4 provider: initial and
// reconnect requests plus a pre-aborted request, printed as one JSON object.
const signer = createSigner({
  clientId: "consumer-client",
  signingSecret: "consumer-signing-secret",
  clock: () => 1_700_000_000_000,
});

const provider = createCredentialProvider({
  signer,
  claims: (request) => ({
    channels: { kind: "restricted", references: [request.channelReference] },
    permissions: {
      kind: "restricted",
      segments: [{ segmentId: "chat", read: true, write: false }],
    },
    replay:
      request.replayLookbackMs !== undefined
        ? { lookbackMs: request.replayLookbackMs }
        : false,
  }),
});

function decodePayload(payload: string): Record<string, unknown> {
  return JSON.parse(atob(payload)) as Record<string, unknown>;
}

async function exerciseProvider(): Promise<unknown> {
  const initial = await provider({
    channelReference: "room-1",
    reason: "initial",
    signal: new AbortController().signal,
  });

  const reconnect = await provider({
    channelReference: "room-1",
    reason: "reconnect",
    disconnectedAt: 1_700_000_000_000,
    replayLookbackMs: 30_000,
    signal: new AbortController().signal,
  });

  const abortedController = new AbortController();
  abortedController.abort("consumer-abort-reason");
  const abortedRequest: CredentialRequest = {
    channelReference: "room-1",
    reason: "initial",
    signal: abortedController.signal,
  };
  let abortedRejection: unknown;
  try {
    await provider(abortedRequest);
  } catch (reason) {
    abortedRejection = reason;
  }

  const initialPayload = decodePayload(initial.payload);
  const reconnectPayload = decodePayload(reconnect.payload);
  return {
    initialReplay: initialPayload.replay,
    initialChannels: initialPayload.channel_references,
    reconnectReplay: reconnectPayload.replay,
    reconnectTimestamp: reconnectPayload.timestamp,
    signatureLengthsEqual: initial.signature.length > 0,
    abortedRejection,
  };
}

// No top-level await: this fixture also compiles to CommonJS.
exerciseProvider().then((result) => console.log(JSON.stringify(result)));
