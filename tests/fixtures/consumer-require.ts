import { blockImportSideEffects } from "./import-guard.js";

blockImportSideEffects();
const originalEnvironment = process.env;
process.env = new Proxy(originalEnvironment, {
  get() {
    throw new Error("Package import read environment");
  },
});

let server: object;
try {
  server = require("@useceleris/server");
} finally {
  // Node's console needs environment access after the package import is checked.
  process.env = originalEnvironment;
}

let privatePathBlocked = false;
try {
  require("@useceleris/server/dist/index.cjs");
} catch {
  privatePathBlocked = true;
}

console.log(
  JSON.stringify({ exports: Object.keys(server), privatePathBlocked }),
);
