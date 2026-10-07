import { hmac } from "@noble/hashes/hmac.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { base64, hex } from "@scure/base";
import { z } from "zod";
import {
  clientIdSchema,
  signingSecretSchema,
  type SigningClaims,
} from "./claims";

import { ConfigurationError } from "./configuration-error";
import { describeParseError } from "./parse-error";
import { prepareTokenPayload } from "./validation";

const signerOptionsSchema = z.strictObject({
  clientId: clientIdSchema,
  signingSecret: signingSecretSchema,
  clock: z
    .custom<() => number>(
      (value) => typeof value === "function",
      "Must be a function",
    )
    .optional(),
});

export type SignerOptions = z.input<typeof signerOptionsSchema>;

export type SignedCredentials = {
  readonly payload: string;
  readonly signature: string;
};

export type Signer = {
  sign(claims: SigningClaims): SignedCredentials;
};

class SigningFailedError extends Error {
  readonly code = "SigningFailed";

  constructor() {
    super("Credential signing failed.");
    this.name = "SigningFailedError";
  } // end constructor
} // end class SigningFailedError

export function createSigner(options: SignerOptions): Signer {
  const parsedOptions = signerOptionsSchema.safeParse(options);

  if (!parsedOptions.success) {
    throw new ConfigurationError(
      describeParseError("signer options", parsedOptions.error),
    );
  }

  const { clientId, signingSecret, clock } = parsedOptions.data;

  return {
    sign(claims: SigningClaims): SignedCredentials {
      const tokenPayload = prepareTokenPayload(claims, clock);

      if (typeof TextEncoder !== "function") {
        throw new ConfigurationError(
          "Signing requires TextEncoder, which this runtime does not provide.",
        );
      }

      try {
        const encoder = new TextEncoder();
        const payload = base64.encode(
          encoder.encode(JSON.stringify(tokenPayload)),
        );

        const digest = hmac(
          sha512,
          encoder.encode(signingSecret),
          encoder.encode(payload),
        );

        const signature = base64.encode(
          encoder.encode(`${clientId}:${hex.encode(digest)}`),
        );

        return { payload, signature };
      } catch {
        throw new SigningFailedError();
      }
    }, // end method sign
  };
} // end function createSigner
