// Framework-neutral credential endpoint: the pattern every browser or
// mobile application needs. The application authenticates its own user and
// derives the authorized claims here, server-side — a requested permission
// from the client is never trusted.
//
// node:http is used only to stay framework-neutral; the handler body is the
// part that ports to Express, Fastify, Hono, Nitro or a serverless function.
import { createServer } from "node:http";
import { createSigner, type SigningClaims } from "@useceleris/server";

const signer = createSigner({
  clientId: process.env.CELERIS_CLIENT_ID!,
  signingSecret: process.env.CELERIS_SIGNING_SECRET!,
});

type User = { id: string; rooms: readonly string[]; moderator: boolean };

// Stand-in for YOUR authentication: a session cookie, bearer token or the
// framework's user object. It must never come from the request body.
function authenticate(authorization: string | undefined): User | undefined {
  if (authorization !== "Bearer demo-session") return undefined;

  return { id: "user-8317", rooms: ["room-42"], moderator: false };
}

// The server decides scope. A moderator may write; everyone else reads.
function claimsFor(user: User, channelReference: string): SigningClaims {
  return {
    channels: { kind: "restricted", references: [channelReference] },
    permissions: {
      kind: "restricted",
      segments: [
        { segmentId: "chat", read: true, write: user.moderator },
        { segmentId: "presence", read: true, write: false },
      ],
    },
    reference: user.id, // identity the peers see; no colons or CR/LF
    replay: { lookbackMs: 30_000 },
  };
}

export const server = createServer(async (request, response) => {
  const user = authenticate(request.headers.authorization);
  if (!user) {
    response.writeHead(401).end(JSON.stringify({ error: "unauthenticated" }));
    return;
  }

  const body = JSON.parse(
    await new Promise<string>((resolve) => {
      let text = "";
      request.on("data", (chunk) => (text += chunk));
      request.on("end", () => resolve(text || "{}"));
    }),
  ) as { channelReference?: unknown };

  // Authorize the requested channel against what the user may access.
  const channelReference = body.channelReference;
  if (
    typeof channelReference !== "string" ||
    !user.rooms.includes(channelReference)
  ) {
    response.writeHead(403).end(JSON.stringify({ error: "forbidden" }));
    return;
  }

  // Sign fresh per request; never cache or backdate credentials.
  const credentials = signer.sign(claimsFor(user, channelReference));
  response
    .writeHead(200, { "content-type": "application/json" })
    .end(JSON.stringify(credentials)); // { payload, signature }
});

if (process.env.CELERIS_EXAMPLE_PORT) {
  server.listen(Number(process.env.CELERIS_EXAMPLE_PORT), () =>
    console.log("example: credential endpoint listening"),
  );
}
