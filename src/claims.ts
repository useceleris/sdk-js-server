import { z } from "zod";

const identifierSchema = z
  .string()
  .min(1)
  .regex(/^[^\r\n]+(?![\s\S])/u);

const colonFreeIdentifierSchema = z
  .string()
  .min(1)
  .regex(/^[^:\r\n]+(?![\s\S])/u);

export const clientIdSchema = colonFreeIdentifierSchema;
export const signingSecretSchema = z.string().min(1);
export const timestampSchema = z.int().min(1).max(253402300799999);

const lookbackSchema = z.int().min(0).max(4294967295);
const channelReferenceSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9-]+(?![\s\S])/);

const restrictedChannelReferencesSchema = z
  .array(channelReferenceSchema)
  .min(1)
  .refine((references) => new Set(references).size === references.length)
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
        )
        .readonly(),
    }),
  ])
  .readonly();

const replaySchema = z.union([
  z.boolean(),
  z.object({ lookbackMs: lookbackSchema }).readonly(),
]);

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
