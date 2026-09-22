import { z } from "zod";
import type { CredentialProvider, CredentialRequest } from "@useceleris/client";
import type { SigningClaims } from "./claims";
import { ConfigurationError } from "./configuration-error";
import type { Signer } from "./signer";

type ClaimsCallback = (
  request: CredentialRequest,
) => SigningClaims | Promise<SigningClaims>;

const credentialProviderOptionsSchema = z.strictObject({
  signer: z.custom<Signer>(
    (value) =>
      typeof (value as { sign?: unknown } | null | undefined)?.sign ===
      "function",
  ),
  claims: z.custom<ClaimsCallback>((value) => typeof value === "function"),
});

export type CredentialProviderOptions = z.input<
  typeof credentialProviderOptionsSchema
>;

// Bridges the synchronous signer to the client's asynchronous
// CredentialProvider (ACK-01). The application's claims callback is
// authoritative: nothing from the untrusted request widens scope beyond what
// it returns, and each call signs fresh claims with a fresh timestamp.
export function createCredentialProvider(
  options: CredentialProviderOptions,
): CredentialProvider {
  const parsedOptions = credentialProviderOptionsSchema.safeParse(options);

  if (!parsedOptions.success) {
    throw new ConfigurationError(
      "Credential provider options must contain a signer and a claims function only.",
    );
  }

  const { signer, claims } = parsedOptions.data;

  return async (request: CredentialRequest) => {
    request.signal.throwIfAborted();
    const signingClaims = await claims(request);
    // A cancellation that landed while claims() ran still rejects before
    // signing; the abort reason propagates for the client to sanitize.
    request.signal.throwIfAborted();

    return signer.sign(signingClaims);
  };
}
