import { expect, expectTypeOf, test } from "vitest";
import {
  signingClaimsSchema,
  type SigningClaims,
  type TokenPayload,
  type TokenPermission,
} from "../../src/claims";

test("claims schemas infer optional inputs and readonly parsed defaults", () => {
  const claims = {
    channels: { kind: "restricted", references: ["room"] },
    permissions: {
      kind: "restricted",
      segments: [{ segmentId: "segment", read: true, write: false }],
    },
  } satisfies SigningClaims;
  const parsedClaims = signingClaimsSchema.parse(claims);

  expectTypeOf<SigningClaims["allowEcho"]>().toEqualTypeOf<
    boolean | undefined
  >();
  expectTypeOf(parsedClaims.allowEcho).toEqualTypeOf<boolean>();
  expectTypeOf(parsedClaims.replay).toEqualTypeOf<
    boolean | Readonly<{ lookbackMs: number }>
  >();

  expectTypeOf<TokenPermission>().toEqualTypeOf<
    Readonly<{ read: boolean; write: boolean }>
  >();

  expectTypeOf<TokenPayload["channel_references"]>().toEqualTypeOf<
    readonly string[] | null
  >();

  // These unreachable assignments verify readonly guarantees during typecheck.
  // oxlint-disable-next-line eslint/no-constant-condition
  if (false) {
    // @ts-expect-error Parsed claims are readonly.
    parsedClaims.allowEcho = true;
    if (parsedClaims.channels.kind === "restricted") {
      // @ts-expect-error Parsed channel arrays are readonly.
      parsedClaims.channels.references.push("another");
    }
  }

  expect(parsedClaims.allowEcho).toBe(false);
  expect(parsedClaims.replay).toBe(false);
  expect(Object.isFrozen(parsedClaims)).toBe(true);
  expect(Object.isFrozen(parsedClaims.channels)).toBe(true);
  expect(Object.isFrozen(claims)).toBe(false);
  if (
    parsedClaims.channels.kind === "restricted" &&
    claims.channels.kind === "restricted"
  ) {
    expect(Object.isFrozen(parsedClaims.channels.references)).toBe(true);
    claims.channels.references.push("another");
    expect(parsedClaims.channels.references).toEqual(["room"]);
  }
});
