for (const name of [
  "crypto",
  "fetch",
  "WebSocket",
  "setTimeout",
  "setInterval",
]) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new Error(`Import accessed forbidden capability: ${name}`);
    },
  });
}
const originalEnvironment = process.env;
process.env = new Proxy(originalEnvironment, {
  get() {
    throw new Error("Package import read environment");
  },
});
let sdk;
try {
  sdk = require("@useceleris/server");
} finally {
  process.env = originalEnvironment;
}
if (Object.keys(sdk).length !== 0)
  throw new Error("Unexpected foundation runtime exports");
let blocked = false;
try {
  require("@useceleris/server/dist/index.cjs");
} catch {
  blocked = true;
}
if (!blocked) throw new Error("Private path was importable");
console.log(JSON.stringify({ imported: true, privatePathBlocked: true }));

export {};
