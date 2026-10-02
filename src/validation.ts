import {
  signingClaimsSchema,
  timestampSchema,
  type TokenPayload,
} from "./claims";

import { ConfigurationError } from "./configuration-error";
import { describeParseError } from "./parse-error";

export function prepareTokenPayload(
  claims: unknown,
  clock: () => number = Date.now,
): TokenPayload {
  const parsedClaims = signingClaimsSchema.safeParse(claims);

  if (!parsedClaims.success) {
    throw new ConfigurationError(
      describeParseError("claims", parsedClaims.error),
    );
  }

  const validatedClaims = parsedClaims.data;
  let timestamp: number;

  try {
    timestamp = clock();
  } catch {
    throw new ConfigurationError(
      "clock() threw instead of returning a millisecond timestamp.",
    );
  }

  const parsedTimestamp = timestampSchema.safeParse(timestamp);

  if (!parsedTimestamp.success) {
    throw new ConfigurationError(
      describeParseError("timestamp from clock()", parsedTimestamp.error),
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
