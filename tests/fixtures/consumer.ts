import { blockImportSideEffects } from "./import-guard";

blockImportSideEffects();
const server = await import("@useceleris/server");

const privatePath = "@useceleris/server/dist/index.js";
let privatePathBlocked = false;
try {
  await import(privatePath);
} catch {
  privatePathBlocked = true;
}

console.log(
  JSON.stringify({ exports: Object.keys(server), privatePathBlocked }),
);
