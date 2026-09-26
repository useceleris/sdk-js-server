import {
  signingClaimsSchema,
  timestampSchema,
  type TokenPayload,
} from "./claims";

import { ConfigurationError } from "./configuration-error";

export function prepareTokenPayload(
  claims: unknown,
  clock: () => number = Date.now,
): TokenPayload {
  const parsedClaims = signingClaimsSchema.safeParse(claims);

  if (!parsedClaims.success) {
    // Only fixed messages cross the SDK boundary; Zod issues can contain input data.
    switch (parsedClaims.error.issues[0]?.path[0]) {
      case "channels":
        throw new ConfigurationError(
          "channels must specify a valid explicit scope with unique references.",
        );
      case "permissions":
        throw new ConfigurationError(
          "permissions must specify valid access flags and unique segment IDs.",
        );
      case "reference":
        throw new ConfigurationError(
          "reference must be nonempty and contain no colon or CR/LF.",
        );
      case "replay":
        throw new ConfigurationError(
          "replay must be a boolean or a supported integer lookback.",
        );
      case "allowEcho":
        throw new ConfigurationError("allowEcho must be a boolean.");
      default:
        throw new ConfigurationError("claims must be a valid object.");
    }
  }

  const validatedClaims = parsedClaims.data;
  let timestamp: number;

  try {
    timestamp = clock();
  } catch {
    throw new ConfigurationError("clock failed to provide a timestamp.");
  }

  const parsedTimestamp = timestampSchema.safeParse(timestamp);

  if (!parsedTimestamp.success) {
    throw new ConfigurationError(
      "timestamp must be an integer within the supported range.",
    );
  }

  return {
    timestamp: parsedTimestamp.data,
    ...(validatedClaims.reference === undefined
      ? {}
      : { reference: validatedClaims.reference }),
    channel_references:
      validatedClaims.channels.kind === "all"
        ? null
        : validatedClaims.channels.references,
    token_permission:
      validatedClaims.permissions.kind === "all"
        ? {
            read: validatedClaims.permissions.read,
            write: validatedClaims.permissions.write,
          }
        : validatedClaims.permissions.segments.map((segment) => ({
            segment_id: segment.segmentId,
            read: segment.read,
            write: segment.write,
          })),
    replay:
      typeof validatedClaims.replay === "boolean"
        ? validatedClaims.replay
        : validatedClaims.replay.lookbackMs,
    allow_echo: validatedClaims.allowEcho,
  };
}
