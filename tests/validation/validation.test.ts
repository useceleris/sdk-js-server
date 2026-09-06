import { expect, test, vi } from "vitest";
import { ConfigurationError } from "../../src/configuration-error.js";
import {
  prepareTokenPayload,
  validateSignerIdentity,
} from "../../src/validation.js";

const claims = {
  channels: { kind: "all" },
  permissions: { kind: "restricted", segments: [] },
};

test.each([false, true, { lookbackMs: 0 }, { lookbackMs: 4294967295 }])(
  "preserves replay %j",
  (replay) => {
    const result = prepareTokenPayload(
      { ...claims, replay, allowEcho: true },
      () => 1,
    );
    expect(result.replay).toBe(
      typeof replay === "boolean" ? replay : replay.lookbackMs,
    );
    expect(result.allow_echo).toBe(true);
  },
);

test.each([
  -1,
  0.5,
  4294967296,
  NaN,
  Infinity,
  -Infinity,
  1n,
  "0",
  null,
  undefined,
])("rejects invalid lookback %s", (lookbackMs) => {
  expect(() =>
    prepareTokenPayload({ ...claims, replay: { lookbackMs } }),
  ).toThrow(ConfigurationError);
});

test.each([null, 0, "false", [], {}].map((value) => ({ value })))(
  "rejects malformed replay $value",
  ({ value: replay }) => {
    expect(() => prepareTokenPayload({ ...claims, replay })).toThrow(
      ConfigurationError,
    );
  },
);

test.each([null, 0, "false", [], {}].map((value) => ({ value })))(
  "rejects malformed echo $value",
  ({ value: allowEcho }) => {
    expect(() => prepareTokenPayload({ ...claims, allowEcho })).toThrow(
      ConfigurationError,
    );
  },
);

test.each([1, 253402300799999])(
  "preserves clock endpoint %i and calls once",
  (timestamp) => {
    const clock = vi.fn(() => timestamp);
    expect(prepareTokenPayload(claims, clock).timestamp).toBe(timestamp);
    expect(clock).toHaveBeenCalledTimes(1);
  },
);

test.each([
  -1,
  0,
  253402300800000,
  0.5,
  NaN,
  Infinity,
  -Infinity,
  Number.MAX_SAFE_INTEGER + 1,
  1n,
  "0",
  null,
])("rejects invalid clock %s", (timestamp) => {
  expect(() =>
    prepareTokenPayload(claims, (() => timestamp) as () => number),
  ).toThrow(ConfigurationError);
});

test("uses Date.now when no clock supplied", () => {
  const clock = vi.spyOn(Date, "now").mockReturnValue(456);
  try {
    expect(prepareTokenPayload(claims).timestamp).toBe(456);
    expect(clock).toHaveBeenCalledTimes(1);
  } finally {
    clock.mockRestore();
  }
});

test("validates explicit signer credentials without changing them", () => {
  expect(() =>
    validateSignerIdentity(" client-雪 ", " secret\n "),
  ).not.toThrow();
});

test.each(["", "a:b", "a\r", "a\n", null, undefined, 1])(
  "rejects invalid client ID %j",
  (clientId) => {
    expect(() => validateSignerIdentity(clientId, "synthetic-secret")).toThrow(
      ConfigurationError,
    );
  },
);

test.each(["", null, undefined, 1])("rejects invalid secret %j", (secret) => {
  expect(() => validateSignerIdentity("client", secret)).toThrow(
    ConfigurationError,
  );
});

test("validation and clock errors never expose supplied values or causes", () => {
  const marker = "synthetic-sensitive-marker";
  const operations = [
    () => validateSignerIdentity(`${marker}:`, marker),
    () => prepareTokenPayload({ ...claims, reference: `${marker}\n` }),
    () =>
      prepareTokenPayload(claims, () => {
        throw new Error(marker);
      }),
  ];
  for (const operation of operations) {
    let caught: unknown;
    try {
      operation();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigurationError);
    const error = caught as ConfigurationError;
    expect(error.code).toBe("Configuration");
    expect(error.cause).toBeUndefined();
    expect(error.message).not.toContain(marker);
    expect(JSON.stringify(error)).not.toContain(marker);
  }
});
