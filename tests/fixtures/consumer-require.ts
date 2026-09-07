import { blockImportSideEffects } from "./import-guard";

blockImportSideEffects();
const server = require("@useceleris/server");

let privatePathBlocked = false;
try {
  require("@useceleris/server/dist/index.cjs");
} catch {
  privatePathBlocked = true;
}

console.log(
  JSON.stringify({ exports: Object.keys(server), privatePathBlocked }),
);
