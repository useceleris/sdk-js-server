import { createSigner } from "@useceleris/server";

// Exercises the missing-TextEncoder branch through the installed package in
// the current runtime. The process is disposable, so the removed global is
// not restored (same rationale as import-guard.ts). Module format does not
// affect this branch, so only the ESM build runs.
const signer = createSigner({
  clientId: "consumer-client",
  signingSecret: "consumer-signing-secret",
  clock: () => 1_700_000_000_000,
});
const claims = {
  channels: { kind: "restricted", references: ["room-1"] },
  permissions: { kind: "all", read: true, write: false },
} as const;

const signedBeforeRemoval = signer.sign(claims).payload.length > 0;

Object.defineProperty(globalThis, "TextEncoder", {
  value: undefined,
  configurable: true,
});

let code: unknown;
let message = "";
try {
  signer.sign(claims);
} catch (error) {
  code = (error as { code?: unknown }).code;
  message = (error as Error).message;
}

console.log(
  JSON.stringify({
    signedBeforeRemoval,
    code,
    safeMessage: message === "Signing requires TextEncoder.",
    messageLeaksSecret: message.includes("consumer-signing-secret"),
  }),
);
