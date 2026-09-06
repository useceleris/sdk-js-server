import { z } from "zod";

const identifierSchema = z
  .string()
  .min(1)
  .regex(/^[^\r\n]+(?![\s\S])/u);

export const clientIdSchema = z
  .string()
  .min(1)
  .regex(/^[^:\r\n]+(?![\s\S])/u);

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
export const tokenPermissionSchema = z.object(permissionFields).readonly();
const segmentClaimSchema = z
  .object({ segmentId: identifierSchema, ...permissionFields })
  .readonly();
const tokenSegmentSchema = z
  .object({ segment_id: identifierSchema, ...permissionFields })
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
    reference: identifierSchema.optional(),
    replay: replaySchema.default(false),
    allowEcho: z.boolean().default(false),
  })
  .readonly();

export const tokenPayloadSchema = z
  .object({
    timestamp: timestampSchema,
    reference: identifierSchema.optional(),
    channel_references: z.array(channelReferenceSchema).readonly().nullable(),
    token_permission: z.union([
      tokenPermissionSchema,
      z.array(tokenSegmentSchema).readonly(),
    ]),
    replay: z.union([z.boolean(), lookbackSchema]),
    allow_echo: z.boolean(),
  })
  .readonly();

export type ChannelScope = z.infer<typeof channelScopeSchema>;
export type SegmentClaim = z.infer<typeof segmentClaimSchema>;
export type SegmentPermissions = z.infer<typeof segmentPermissionsSchema>;
export type SigningClaims = z.input<typeof signingClaimsSchema>;
export type TokenPermission = z.infer<typeof tokenPermissionSchema>;
export type TokenPayload = z.infer<typeof tokenPayloadSchema>;
