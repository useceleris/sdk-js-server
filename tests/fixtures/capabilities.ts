const bytes = new TextEncoder().encode("Celeris \u{1f680}");
if (new TextDecoder().decode(bytes) !== "Celeris \u{1f680}")
  throw new Error("UTF-8 mismatch");
const controller = new AbortController();
controller.abort();
if (!controller.signal.aborted) throw new Error("AbortSignal mismatch");
const key = await crypto.subtle.importKey(
  "raw",
  new Uint8Array(20).fill(0x0b),
  { name: "HMAC", hash: "SHA-512" },
  false,
  ["sign"],
);
const signature = new Uint8Array(
  await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("Hi There")),
);
const hex = Array.from(signature, (byte) =>
  byte.toString(16).padStart(2, "0"),
).join("");
// RFC 4231 test case 1; this probes the runtime, not a Celeris signer.
const expected =
  "87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854";
if (hex !== expected) throw new Error("HMAC known vector mismatch");
console.log(JSON.stringify({ utf8: true, cancellation: true, hmac: hex }));

export {};
