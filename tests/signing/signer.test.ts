import { afterEach, expect, test, vi } from "vitest";
import { createSigner, type SignerOptions } from "../../src/signer";
import { signingVectors } from "../fixtures/signing-vectors";

const vector = signingVectors[0]!;
const signerOptions = {
  clientId: vector.clientId,
  signingSecret: vector.signingSecret,
  clock: () => vector.timestamp,
};

afterEach(() => vi.unstubAllGlobals());

test.each(signingVectors)("matches independent $name credentials", (vector) => {
  const signer = createSigner({
    clientId: vector.clientId,
    signingSecret: vector.signingSecret,
    clock: () => vector.timestamp,
  });
  expect(signer.sign(vector.claims)).toEqual(vector.expected);
});

test("uses fresh timestamps and changed claims or secrets", () => {
  let timestamp = vector.timestamp;
  const signer = createSigner({ ...signerOptions, clock: () => timestamp++ });
  const first = signer.sign(vector.claims);
  const second = signer.sign(vector.claims);
  expect(first).not.toEqual(second);
  expect(
    createSigner(signerOptions).sign({
      ...vector.claims,
      allowEcho: true,
    }),
  ).not.toEqual(first);
  expect(
    createSigner({
      ...signerOptions,
      signingSecret: "different-secret",
    }).sign(vector.claims),
  ).not.toEqual(first);
});

test("construction needs no crypto and copies configuration", () => {
  vi.stubGlobal("crypto", undefined);
  const options: SignerOptions = { ...signerOptions };
  const signer = createSigner(options);
  options.signingSecret = "changed";
  vi.unstubAllGlobals();
  expect(signer.sign(vector.claims)).toEqual(vector.expected);
});

test("reports missing TextEncoder at signing", () => {
  const signer = createSigner(signerOptions);
  vi.stubGlobal("TextEncoder", undefined);
  expect(() => signer.sign(vector.claims)).toThrow(
    expect.objectContaining({ code: "Configuration" }),
  );
});

test("invalid configuration and claims throw synchronously", () => {
  expect(() => createSigner({ ...signerOptions, clientId: "" })).toThrow();
  expect(() =>
    createSigner({ ...signerOptions, clock: 1 } as unknown as SignerOptions),
  ).toThrow();
  expect(() =>
    createSigner(signerOptions).sign({
      ...vector.claims,
      channels: { kind: "restricted", references: [] },
    }),
  ).toThrow(expect.objectContaining({ code: "Configuration" }));
});

test("caller mutation after invocation does not change credentials", () => {
  const claims = {
    channels: { kind: "restricted" as const, references: ["room-1"] },
    permissions: {
      kind: "restricted" as const,
      segments: [{ segmentId: "messages", read: true, write: false }],
    },
  };
  const credentials = createSigner(signerOptions).sign(claims);
  claims.channels.references.push("other");
  claims.permissions.segments[0]!.write = true;
  expect(credentials).toEqual(vector.expected);
});

test("rejects the removed crypto option instead of ignoring it", () => {
  expect(() =>
    createSigner({ ...signerOptions, crypto: {} } as unknown as SignerOptions),
  ).toThrow();
});

test("signing needs neither Web Crypto nor btoa", () => {
  vi.stubGlobal("crypto", undefined);
  vi.stubGlobal("btoa", undefined);
  expect(createSigner(signerOptions).sign(vector.claims)).toEqual(
    vector.expected,
  );
});

test.each(["", "a:b", "a\r", "a\n", null, undefined, 1])(
  "rejects invalid client ID %j",
  (clientId) => {
    expect(() =>
      createSigner({ ...signerOptions, clientId } as unknown as SignerOptions),
    ).toThrow();
  },
);

test.each(["", null, undefined, 1])(
  "rejects invalid signing secret %j",
  (signingSecret) => {
    expect(() =>
      createSigner({
        ...signerOptions,
        signingSecret,
      } as unknown as SignerOptions),
    ).toThrow();
  },
);

test("encoding failures omit secrets, claims and raw causes", () => {
  const sensitive = "synthetic-sensitive-marker";
  vi.stubGlobal(
    "TextEncoder",
    class {
      encode() {
        throw new Error(sensitive);
      }
    },
  );
  let error: unknown;
  try {
    createSigner({ ...signerOptions, signingSecret: sensitive }).sign({
      ...vector.claims,
      reference: sensitive,
    });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).cause).toBeUndefined();
  expect((error as Error).message).toBe("Credential signing failed.");
  expect(JSON.stringify(error)).not.toContain(sensitive);
});
