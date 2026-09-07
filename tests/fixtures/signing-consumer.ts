import { createSigner } from "@useceleris/server";
import { signingVectors } from "./signing-vectors";

const results = signingVectors.map((vector) => {
  const signer = createSigner({
    clientId: vector.clientId,
    signingSecret: vector.signingSecret,
    clock: () => vector.timestamp,
  });
  return signer.sign(vector.claims);
});
console.log(JSON.stringify(results));
