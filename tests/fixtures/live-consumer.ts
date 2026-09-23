import { createCredentialProvider, createSigner } from "@useceleris/server";
import { createClient } from "@useceleris/client";

// Runs against the live celeris-realtime stack from the installed tarballs
// of both packages, in whichever runtime executes this file. Prints one
// JSON result object. ESM only: messaging behavior is module-format
// independent (S5 precedent).
function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set for the live consumer.`);

  return value;
}

const reference = `jsqual-server-live-${Date.now()}-${Math.floor(
  Math.random() * 1_000,
)}`;

const signer = createSigner({
  clientId: requireEnvironment("CELERIS_CLIENT_ID"),
  signingSecret: requireEnvironment("CELERIS_SIGNING_SECRET"),
});

const client = createClient({
  baseUrl: requireEnvironment("CELERIS_WS_URL"),
  allowInsecureLoopback: true,
  credentialProvider: createCredentialProvider({
    signer,
    claims: () => ({
      channels: { kind: "restricted", references: [reference] },
      permissions: { kind: "all", read: true, write: true },
      reference: "jsqual-server-live",
      allowEcho: true,
    }),
  }),
});

async function exerciseLiveStack(): Promise<unknown> {
  const channel = client.channel(reference);
  await channel.connect();

  const chat = channel.segment("chat");
  const delivery = new Promise<{ id: string; body: string }>(
    (resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Timed out waiting for the echoed delivery.")),
        20_000,
      );
      chat.onMessage((payload, metadata) => {
        clearTimeout(timer);
        resolve({
          id: metadata.messageId,
          body: new TextDecoder().decode(payload),
        });
      });
    },
  );
  chat.subscribe();
  await new Promise((resolve) => setTimeout(resolve, 1_500));

  await chat.publish({
    payload: new TextEncoder().encode("live-consumer"),
  });
  const message = await delivery;

  const page = await chat.presenceList({ page: 1, perPage: 10 });
  await channel.close();

  return {
    ok: message.body === "live-consumer" && message.id.length > 0,
    delivered: 1,
    idAssigned: message.id.startsWith("msg_"),
    presentCount: Number(page.total),
  };
}

exerciseLiveStack().then(
  (result) => console.log(JSON.stringify(result)),
  (error) => {
    console.log(JSON.stringify({ ok: false, error: String(error) }));
    // A failed qualification run must fail the suite via its assertions.
  },
);
