import { z } from "zod";

// TextEncoder would silently turn an unpaired surrogate into U+FFFD, so the
// signed bytes would no longer match what the caller passed. Unicode mode
// matches only lone surrogates; valid pairs pass.
const wellFormedStringSchema = z
  .string()
  .min(1, "Must not be empty")
  .refine(
    (value) => !/[\uD800-\uDFFF]/u.test(value),
    "Must not contain unpaired UTF-16 surrogates",
  );

const identifierSchema = wellFormedStringSchema.regex(
  /^[^\r\n]+(?![\s\S])/u,
  "Must not contain CR or LF",
);

const colonFreeIdentifierSchema = wellFormedStringSchema.regex(
  /^[^:\r\n]+(?![\s\S])/u,
  "Must not contain a colon, CR or LF",
);

export const clientIdSchema = colonFreeIdentifierSchema;
export const signingSecretSchema = wellFormedStringSchema;
export const timestampSchema = z.int().min(1).max(253402300799999);

const lookbackSchema = z.int().min(0).max(4294967295);
const channelReferenceSchema = z
  .string()
  .min(1, "Must not be empty")
  .max(255, "Must be at most 255 characters")
  .regex(
    /^[a-zA-Z0-9_-]+(?![\s\S])/,
    "Must contain only ASCII letters, digits, hyphens (-) or underscores (_)",
  );

const restrictedChannelReferencesSchema = z
  .array(channelReferenceSchema)
  .min(1, "Must list at least one channel reference")
  .refine(
    (references) => new Set(references).size === references.length,
    "Must not repeat a channel reference",
  )
  .readonly();

const channelScopeSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("all") }),
    z.object({
      kind: z.literal("restricted"),
      references: restrictedChannelReferencesSchema,
    }),
  ])
  .readonly();

const permissionFields = { read: z.boolean(), write: z.boolean() };
const segmentClaimSchema = z
  .object({ segmentId: identifierSchema, ...permissionFields })
  .readonly();
const segmentPermissionsSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("all"), ...permissionFields }),
    z.object({
      kind: z.literal("restricted"),
      segments: z
        .array(segmentClaimSchema)
        .refine(
          (segments) =>
            new Set(segments.map((segment) => segment.segmentId)).size ===
            segments.length,
          "Must not repeat a segment ID",
        )
        .readonly(),
    }),
  ])
  .readonly();

const replaySchema = z.union(
  [z.boolean(), z.object({ lookbackMs: lookbackSchema }).readonly()],
  "Must be a boolean or an object with an integer lookbackMs",
);

export const signingClaimsSchema = z
  .object({
    channels: channelScopeSchema,
    permissions: segmentPermissionsSchema,
    reference: colonFreeIdentifierSchema.optional(),
    replay: replaySchema.default(false),
    allowEcho: z.boolean().default(false),
  })
  .readonly();

export type ChannelScope = z.infer<typeof channelScopeSchema>;
export type SegmentClaim = z.infer<typeof segmentClaimSchema>;
export type SegmentPermissions = z.infer<typeof segmentPermissionsSchema>;
export type SigningClaims = z.input<typeof signingClaimsSchema>;

export type TokenPermission = {
  readonly read: boolean;
  readonly write: boolean;
};

export type TokenPayload = {
  readonly timestamp: number;
  readonly reference?: string;
  readonly channel_references: readonly string[] | null;
  readonly token_permission:
    | TokenPermission
    | readonly (TokenPermission & { readonly segment_id: string })[];
  readonly replay: boolean | number;
  readonly allow_echo: boolean;
};
