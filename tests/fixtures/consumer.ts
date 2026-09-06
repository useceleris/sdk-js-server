const originals = new Map<string, PropertyDescriptor | undefined>();
for (const name of [
  "crypto",
  "fetch",
  "WebSocket",
  "setTimeout",
  "setInterval",
]) {
  originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new Error(`Import accessed forbidden capability: ${name}`);
    },
  });
}
const sdk = await import("@useceleris/server");
if (Object.keys(sdk).length !== 0)
  throw new Error("Unexpected foundation runtime exports");
for (const [name, descriptor] of originals) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else Reflect.deleteProperty(globalThis, name);
}
const privatePath = "@useceleris/server/dist/index.js";
let blocked = false;
try {
  await import(privatePath);
} catch {
  blocked = true;
}
if (!blocked) throw new Error("Private path was importable");
console.log(JSON.stringify({ imported: true, privatePathBlocked: true }));

export {};
