import { expect, test } from "vitest";
import type { SigningClaims } from "../../src/claims";
import { prepareTokenPayload } from "../../src/validation";

const claims: SigningClaims = {
  channels: { kind: "restricted", references: ["room-1"] },
  permissions: { kind: "restricted", segments: [] },
};

function prepareTestTokenPayload(overrides: Record<string, unknown> = {}) {
  return prepareTokenPayload({ ...claims, ...overrides }, () => 123);
} // end function prepareTestTokenPayload

test("constructs exact deny-all payload with explicit defaults", () => {
  expect(prepareTestTokenPayload()).toEqual({
    timestamp: 123,
    channel_references: ["room-1"],
    token_permission: [],
    replay: false,
    allow_echo: false,
  });

  expect(
    prepareTestTokenPayload({
      reference: undefined,
      replay: undefined,
      allowEcho: undefined,
    }),
  ).toEqual(prepareTestTokenPayload());
});

test("accepts letters, digits, hyphens and underscores in channel references", () => {
  expect(
    prepareTestTokenPayload({
      channels: { kind: "restricted", references: ["room_1-A"] },
    }).channel_references,
  ).toEqual(["room_1-A"]);
});

test.each([
  {
    claim: "permissions.segments[0].segmentId",
    overrides: {
      permissions: {
        kind: "restricted",
        segments: [{ segmentId: "chat\uD800", read: true, write: false }],
      },
    },
  },
  { claim: "reference", overrides: { reference: "user\uDC00" } },
])("rejects an unpaired surrogate in $claim", ({ claim, overrides }) => {
  expect(() => prepareTestTokenPayload(overrides)).toThrow(
    `Invalid claims. ${claim}: Must not contain unpaired UTF-16 surrogates.`,
  );
});

test("keeps well-formed non-BMP characters in identifiers", () => {
  expect(
    prepareTestTokenPayload({
      reference: "user-😀",
      permissions: {
        kind: "restricted",
        segments: [{ segmentId: "chat-😀", read: true, write: false }],
      },
    }),
  ).toMatchObject({
    reference: "user-😀",
    token_permission: [{ segment_id: "chat-😀", read: true, write: false }],
  });
});

test("names the failed claim and rule without repeating the input", () => {
  expect(() =>
    prepareTestTokenPayload({
      channels: { kind: "restricted", references: ["room 1"] },
    }),
  ).toThrow(
    "Invalid claims. channels.references[0]: Must contain only ASCII letters, digits, hyphens (-) or underscores (_).",
  );
});

test.each([1, 255])("accepts channel length %i", (length) => {
  expect(
    prepareTestTokenPayload({
      channels: { kind: "restricted", references: ["a".repeat(length)] },
    }).channel_references,
  ).toEqual(["a".repeat(length)]);
});

test.each(
  [
    [],
    [""],
    ["a", "a"],
    ["a".repeat(256)],
    ["é"],
    ["a.b"],
    ["a:b"],
    ["a\n"],
    ["a\r"],
    [null],
    [12],
  ].map((references) => ({ references })),
)("rejects unsafe channel list $references", ({ references }) => {
  expect(() =>
    prepareTestTokenPayload({ channels: { kind: "restricted", references } }),
  ).toThrow();
});

test.each(
  [
    undefined,
    null,
    [],
    {},
    { kind: "unknown" },
    { kind: "restricted", references: "room" },
  ].map((channels) => ({ channels })),
)("rejects malformed channel scope $channels", ({ channels }) => {
  expect(() => prepareTestTokenPayload({ channels })).toThrow();
});

test.each([
  [false, false],
  [true, false],
  [false, true],
  [true, true],
])("preserves access read=%s write=%s", (read, write) => {
  expect(
    prepareTestTokenPayload({
      channels: { kind: "all" },
      permissions: { kind: "all", read, write },
    }),
  ).toEqual({
    timestamp: 123,
    channel_references: null,
    token_permission: { read, write },
    replay: false,
    allow_echo: false,
  });

  expect(
    prepareTestTokenPayload({
      permissions: {
        kind: "restricted",
        segments: [{ segmentId: "雪", read, write }],
      },
    }).token_permission,
  ).toEqual([{ segment_id: "雪", read, write }]);
});

test.each(
  [
    null,
    undefined,
    [],
    {},
    { kind: "unknown" },
    { kind: "all", read: true },
    { kind: "all", read: "true", write: false },
    { kind: "restricted", segments: null },
    { kind: "restricted", segments: [null] },
  ].map((permissions) => ({ permissions })),
)("rejects malformed permissions $permissions", ({ permissions }) => {
  expect(() => prepareTestTokenPayload({ permissions })).toThrow();
});

test.each(["", "a\r", "a\n", null, 1])(
  "rejects invalid segment and identity %j",
  (value) => {
    expect(() => prepareTestTokenPayload({ reference: value })).toThrow();
    expect(() =>
      prepareTestTokenPayload({
        permissions: {
          kind: "restricted",
          segments: [{ segmentId: value, read: true, write: false }],
        },
      }),
    ).toThrow();
  },
);

test("rejects duplicate segments without merging grants", () => {
  expect(() =>
    prepareTestTokenPayload({
      permissions: {
        kind: "restricted",
        segments: [
          { segmentId: "room", read: true, write: false },
          { segmentId: "room", read: false, write: true },
        ],
      },
    }),
  ).toThrow();
});

test("copies nested claims, preserves values and excludes extra fields", () => {
  const input = {
    channels: { kind: "restricted", references: ["b", "a"] },
    permissions: {
      kind: "restricted",
      segments: [
        { segmentId: " 雪 ", read: true, write: false, extra: "omit" },
      ],
    },
    reference: " 身分 ",
    extra: "omit",
    timestamp: 999,
  };
  const original = structuredClone(input);
  const payload = prepareTokenPayload(input, () => 123);
  expect(input).toEqual(original);
  input.channels.references.push("c");
  input.permissions.segments[0]!.write = true;
  expect(payload).toEqual({
    timestamp: 123,
    channel_references: ["b", "a"],
    token_permission: [{ segment_id: " 雪 ", read: true, write: false }],
    reference: " 身分 ",
    replay: false,
    allow_echo: false,
  });
});

test.each([null, undefined, [], "claims", 1].map((value) => ({ value })))(
  "rejects malformed claims $value",
  ({ value }) => {
    expect(() => prepareTokenPayload(value)).toThrow();
  },
);

test("rejects colon in user references without restricting segment colons", () => {
  expect(() => prepareTestTokenPayload({ reference: "user:123" })).toThrow();
  expect(
    prepareTestTokenPayload({
      permissions: {
        kind: "restricted",
        segments: [{ segmentId: "topic:part", read: true, write: false }],
      },
    }).token_permission,
  ).toEqual([{ segment_id: "topic:part", read: true, write: false }]);
});
