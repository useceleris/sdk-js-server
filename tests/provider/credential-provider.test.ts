import { expect, test, vi } from "vitest";
import type { CredentialProvider, CredentialRequest } from "@useceleris/client";
import type { SigningClaims } from "../../src/claims";
import {
  createCredentialProvider,
  type CredentialProviderOptions,
} from "../../src/credential-provider";
import { createSigner } from "../../src/signer";

const signerOptions = {
  clientId: "client-1",
  signingSecret: "signing-secret-1",
  clock: () => 1_700_000_000_000,
};

const restrictedClaims: SigningClaims = {
  channels: { kind: "restricted", references: ["room-1"] },
  permissions: {
    kind: "restricted",
    segments: [{ segmentId: "chat", read: true, write: false }],
  },
};

function initialRequest(signal?: AbortSignal): CredentialRequest {
  return {
    channelReference: "room-1",
    reason: "initial",
    signal: signal ?? new AbortController().signal,
  };
}

function reconnectRequest(replayLookbackMs: number): CredentialRequest {
  return {
    channelReference: "room-1",
    reason: "reconnect",
    disconnectedAt: 1_700_000_000_000,
    replayLookbackMs,
    signal: new AbortController().signal,
  };
}

function decodePayload(payload: string): Record<string, unknown> {
  return JSON.parse(atob(payload)) as Record<string, unknown>;
}

test("invokes claims freshly per call and signs a fresh timestamp", async () => {
  let now = 1_700_000_000_000;
  const claims = vi.fn(() => restrictedClaims);
  const provider = createCredentialProvider({
    signer: createSigner({ ...signerOptions, clock: () => now++ }),
    claims,
  });

  const first = await provider(initialRequest());
  const second = await provider(initialRequest());

  expect(claims).toHaveBeenCalledTimes(2);
  expect(claims).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ channelReference: "room-1", reason: "initial" }),
  );
  expect(decodePayload(first.payload).timestamp).toBe(1_700_000_000_000);
  expect(decodePayload(second.payload).timestamp).toBe(1_700_000_000_001);
  expect(first).not.toEqual(second);
});

test("maps replayLookbackMs through the claims callback on reconnect only", async () => {
  // The canonical EXAMPLES.md callback: replay comes from the request.
  const provider = createCredentialProvider({
    signer: createSigner(signerOptions),
    claims: (request) => ({
      ...restrictedClaims,
      replay:
        request.replayLookbackMs !== undefined
          ? { lookbackMs: request.replayLookbackMs }
          : false,
    }),
  });

  const reconnect = await provider(reconnectRequest(30_000));
  const initial = await provider(initialRequest());

  expect(decodePayload(reconnect.payload).replay).toBe(30_000);
  expect(decodePayload(initial.payload).replay).toBe(false);
});

test("a pre-aborted request rejects before claims or signing", async () => {
  const controller = new AbortController();
  controller.abort("synthetic-abort-reason");
  const claims = vi.fn(() => restrictedClaims);
  const sign = vi.fn();
  const provider = createCredentialProvider({
    signer: { sign },
    claims,
  } as unknown as CredentialProviderOptions);

  await expect(provider(initialRequest(controller.signal))).rejects.toBe(
    "synthetic-abort-reason",
  );
  expect(claims).not.toHaveBeenCalled();
  expect(sign).not.toHaveBeenCalled();
});

test("an abort during asynchronous claims rejects before signing", async () => {
  const controller = new AbortController();
  const sign = vi.fn();
  const provider = createCredentialProvider({
    signer: { sign },
    claims: async () => {
      controller.abort("synthetic-mid-flight-abort");
      return restrictedClaims;
    },
  } as unknown as CredentialProviderOptions);

  await expect(provider(initialRequest(controller.signal))).rejects.toBe(
    "synthetic-mid-flight-abort",
  );
  expect(sign).not.toHaveBeenCalled();
});

// The provider awaits the pending claims and rejects at the post-claims
// abort check, so an abort that lands mid-acquisition can never reach the
// signer — no signature ever exists for the client to suppress (AUTH-04).
test("an external abort during pending claims suppresses late completion", async () => {
  const realSigner = createSigner(signerOptions);
  const sign = vi.fn((claims: SigningClaims) => realSigner.sign(claims));
  let releaseClaims!: (claims: SigningClaims) => void;
  let signalClaimsStarted!: () => void;
  const claimsStarted = new Promise<void>((resolve) => {
    signalClaimsStarted = resolve;
  });
  const provider = createCredentialProvider({
    signer: { sign },
    claims: () =>
      new Promise<SigningClaims>((resolve) => {
        signalClaimsStarted();
        releaseClaims = resolve;
      }),
  });

  const controller = new AbortController();
  const pending = provider(initialRequest(controller.signal));
  await claimsStarted;
  controller.abort("synthetic-external-abort");
  releaseClaims(restrictedClaims);

  await expect(pending).rejects.toBe("synthetic-external-abort");
  expect(sign).not.toHaveBeenCalled();
});

test("signers hold no shared credential state", async () => {
  const providerA = createCredentialProvider({
    signer: createSigner(signerOptions),
    claims: () => restrictedClaims,
  });
  const providerB = createCredentialProvider({
    signer: createSigner({
      ...signerOptions,
      signingSecret: "other-signing-secret",
    }),
    claims: () => restrictedClaims,
  });

  const firstA = await providerA(initialRequest());
  const firstB = await providerB(initialRequest());
  const secondA = await providerA(initialRequest());

  expect(firstA.payload).toBe(firstB.payload);
  expect(firstA.signature).not.toBe(firstB.signature);
  expect(secondA).toEqual(firstA);
});

test("a claims rejection propagates unchanged without signing", async () => {
  const failure = new Error("synthetic-claims-failure");
  const sign = vi.fn();
  const provider = createCredentialProvider({
    signer: { sign },
    claims: async () => {
      throw failure;
    },
  } as unknown as CredentialProviderOptions);

  await expect(provider(initialRequest())).rejects.toBe(failure);
  expect(sign).not.toHaveBeenCalled();
});

test("hostile request fields never widen scope beyond the claims result", async () => {
  const provider = createCredentialProvider({
    signer: createSigner(signerOptions),
    claims: () => restrictedClaims,
  });
  const hostileRequest = {
    ...initialRequest(),
    channelReference: "unauthorized-channel",
    extraChannels: ["unauthorized-channel"],
  } as CredentialRequest;

  const payload = decodePayload((await provider(hostileRequest)).payload);

  expect(payload.channel_references).toEqual(["room-1"]);
  expect(payload.token_permission).toEqual([
    { segment_id: "chat", read: true, write: false },
  ]);
  expect(payload).not.toHaveProperty("extraChannels");
});

const signerRule = "signer: Must be an object with a sign() method.";
const claimsRule = "claims: Must be a function.";

test.each([
  { options: {}, detail: `${signerRule} ${claimsRule}` },
  { options: { signer: createSigner(signerOptions) }, detail: claimsRule },
  { options: { claims: () => restrictedClaims }, detail: signerRule },
  {
    options: { signer: {}, claims: () => restrictedClaims },
    detail: signerRule,
  },
  {
    options: { signer: createSigner(signerOptions), claims: "callback" },
    detail: claimsRule,
  },
  {
    options: {
      signer: createSigner(signerOptions),
      claims: () => restrictedClaims,
      extra: true,
    },
    detail: "Contains an unsupported key.",
  },
])("rejects invalid provider options %#", ({ options, detail }) => {
  let error: unknown;
  try {
    createCredentialProvider(options as unknown as CredentialProviderOptions);
  } catch (caught) {
    error = caught;
  }

  expect(error).toMatchObject({
    code: "Configuration",
    message: `Invalid credential provider options. ${detail}`,
  });
  expect((error as Error).cause).toBeUndefined();
  const serialized = JSON.stringify(
    error,
    Object.getOwnPropertyNames(error as object),
  );
  expect(serialized).not.toContain(signerOptions.signingSecret);
  expect(serialized).not.toContain("extra");
});

test("invalid claims results surface the signer's configuration error", async () => {
  const provider = createCredentialProvider({
    signer: createSigner(signerOptions),
    claims: () =>
      ({
        ...restrictedClaims,
        channels: { kind: "restricted", references: [] },
      }) as unknown as SigningClaims,
  });

  await expect(provider(initialRequest())).rejects.toMatchObject({
    code: "Configuration",
  });
});

test("the provider satisfies the client's CredentialProvider contract", async () => {
  const provider: CredentialProvider = createCredentialProvider({
    signer: createSigner(signerOptions),
    claims: () => restrictedClaims,
  });

  const credentials = await provider(initialRequest());
  expect(typeof credentials.payload).toBe("string");
  expect(typeof credentials.signature).toBe("string");
  expect(credentials.payload.length).toBeGreaterThan(0);
  expect(credentials.signature.length).toBeGreaterThan(0);
});
