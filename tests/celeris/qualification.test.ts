import { describe, expect, it } from "vitest";
import { ServerError } from "@useceleris/client";
import {
  allPermissionClaims,
  connectedChannel,
  nextError,
  nextMessage,
  nextNotice,
  nextPresence,
  qualificationClient,
  uniqueChannelReference,
} from "./helpers/environment";

const utf8 = (value: string) => new TextEncoder().encode(value);
const text = (payload: Uint8Array) => new TextDecoder().decode(payload);
const settle = (ms = 1_500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("celeris server-signed credentials", () => {
  it("connects with server-signed credentials and receives the greetings", async () => {
    const reference = uniqueChannelReference("auth");
    const channel = qualificationClient(allPermissionClaims(reference)).channel(
      reference,
    );
    const notices: string[] = [];
    channel.events().onNotice((notice) => notices.push(text(notice.payload)));

    await channel.connect();
    await nextNotice(
      channel,
      () => notices.length >= 2,
      "the connect and default-subscribe greetings",
    );

    expect(
      notices.some((entry) => entry.includes("Successfully connected")),
    ).toBe(true);
    await channel.close();
  });

  it("rejects a wrong secret and an unknown client id as Transport", async () => {
    const reference = uniqueChannelReference("reject");
    const claims = allPermissionClaims(reference);

    const wrongSecret = qualificationClient(claims, {
      signingSecret: "wrong-signing-secret",
    }).channel(reference);
    const secretError = await wrongSecret
      .connect()
      .then(() => undefined)
      .catch((failure: unknown) => failure);
    expect(secretError).toMatchObject({ code: "Transport" });
    expect(wrongSecret.state).toBe("failed");
    expect(
      JSON.stringify(
        secretError,
        Object.getOwnPropertyNames(secretError as object),
      ),
    ).not.toContain("wrong-signing-secret");

    const unknownClient = qualificationClient(claims, {
      clientId: "js-qual-unknown",
    }).channel(reference);
    await expect(unknownClient.connect()).rejects.toMatchObject({
      code: "Transport",
    });
  });

  it("rejects expired and future clocks; accepts inside the observed window", async () => {
    const reference = uniqueChannelReference("window");
    const claims = allPermissionClaims(reference);

    const expired = qualificationClient(claims, {
      clock: () => Date.now() - 61 * 60 * 1_000,
    }).channel(reference);
    await expect(expired.connect()).rejects.toMatchObject({
      code: "Transport",
    });

    const future = qualificationClient(claims, {
      clock: () => Date.now() + 5 * 60 * 1_000,
    }).channel(reference);
    await expect(future.connect()).rejects.toMatchObject({
      code: "Transport",
    });

    // D-001: the server accepts up to the observed 60-minute window against
    // a documented 60-second intent — recorded, not relied upon. A fresh
    // signer timestamp never shortens server acceptance (S2.4).
    const stale = qualificationClient(claims, {
      clock: () => Date.now() - 59 * 60 * 1_000,
    }).channel(reference);
    await stale.connect();
    await stale.close();
  });

  it("enforces the token's channel restriction", async () => {
    const allowed = uniqueChannelReference("scope-allowed");
    const denied = uniqueChannelReference("scope-denied");
    const claims = allPermissionClaims(allowed);

    const outside = qualificationClient(claims).channel(denied);
    await expect(outside.connect()).rejects.toMatchObject({
      code: "Transport",
    });

    const inside = await connectedChannel(allowed, claims);
    expect(inside.state).toBe("connected");
    await inside.close();
  });
});

describe("celeris messaging, replay and presence through the provider", () => {
  it("round-trips a binary payload with a server-assigned id and no self-echo", async () => {
    const reference = uniqueChannelReference("msg");
    const claims = allPermissionClaims(reference);
    const publisher = await connectedChannel(reference, claims);
    const receiver = await connectedChannel(reference, claims);
    const publisherSaw: string[] = [];
    publisher.segment("chat").onMessage((_payload, metadata) => {
      publisherSaw.push(metadata.messageId);
    });
    publisher.segment("chat").subscribe();
    receiver.segment("chat").subscribe();
    await settle();

    await publisher.segment("chat").publish({ payload: utf8("hello-서버") });
    const message = await nextMessage(
      receiver.segment("chat"),
      () => true,
      "cross-connection delivery",
    );

    expect(message.messageId).toMatch(/^msg_/);
    expect(text(message.payload)).toBe("hello-서버");
    await settle();
    expect(publisherSaw).toHaveLength(0);

    await publisher.close();
    await receiver.close();
  });

  it("echoes to the publisher when claims allow echo", async () => {
    const reference = uniqueChannelReference("echo");
    const channel = await connectedChannel(reference, {
      ...allPermissionClaims(reference),
      allowEcho: true,
    });
    channel.segment("chat").subscribe();
    await settle();

    await channel.segment("chat").publish({ payload: utf8("self") });
    const echoed = await nextMessage(
      channel.segment("chat"),
      (message) => text(message.payload) === "self",
      "an echoed publish",
    );
    expect(echoed.messageId).toMatch(/^msg_/);

    await channel.close();
  });

  it("denies a read-only restricted segment's publish while staying connected", async () => {
    const reference = uniqueChannelReference("perm");
    // The restricted-segments claims shape (segment_id array on the wire)
    // was never signed by the client's C8 suites; this qualifies it live.
    const readOnly = await connectedChannel(reference, {
      channels: { kind: "restricted", references: [reference] },
      permissions: {
        kind: "restricted",
        segments: [{ segmentId: "chat", read: true, write: false }],
      },
    });

    // Publish resolves locally; the denial arrives later, naming the segment.
    await readOnly.segment("chat").publish({ payload: utf8("denied") });
    const denial = await nextError(
      readOnly,
      (error) =>
        error instanceof ServerError && error.type === "PermissionDeniedError",
      "the PermissionDeniedError frame",
    );
    expect(denial).toMatchObject({ subType: "PUB", resource: "chat" });
    expect(readOnly.state).toBe("connected");

    await readOnly.close();
  });

  it("replays recent messages with identical ids via provider reconnect claims", async () => {
    const reference = uniqueChannelReference("replay");
    const claims = allPermissionClaims(reference);
    const publisher = await connectedChannel(reference, claims);
    const liveReceiver = await connectedChannel(reference, claims);
    const liveIds: string[] = [];
    liveReceiver.segment("history").onMessage((_payload, metadata) => {
      liveIds.push(metadata.messageId);
    });
    liveReceiver.segment("history").subscribe();
    await settle();

    for (const body of ["one", "two", "three"]) {
      await publisher.segment("history").publish({ payload: utf8(body) });
    }
    await nextMessage(
      liveReceiver.segment("history"),
      () => liveIds.length >= 3,
      "the three live deliveries",
      20_000,
    );
    await liveReceiver.close();

    // A fresh connection whose claims callback applies the request's replay
    // lookback (the canonical EXAMPLES.md mapping) receives the same
    // messages again, ids preserved.
    const replayReceiver = await connectedChannel(reference, (request) => ({
      ...claims,
      replay:
        request.replayLookbackMs !== undefined
          ? { lookbackMs: request.replayLookbackMs }
          : { lookbackMs: 60_000 },
    }));
    const replayed: { payload: Uint8Array; messageId: string }[] = [];
    replayReceiver.segment("history").onMessage((payload, metadata) => {
      replayed.push({ payload, messageId: metadata.messageId });
    });
    replayReceiver.segment("history").subscribe();

    await nextMessage(
      replayReceiver.segment("history"),
      () => replayed.length >= 3,
      "the replayed history",
      25_000,
    );
    const replayedByBody = new Map(
      replayed.map((message) => [text(message.payload), message.messageId]),
    );
    for (const [index, body] of ["one", "two", "three"].entries()) {
      expect(replayedByBody.get(body)).toBe(liveIds[index]);
    }

    await publisher.close();
    await replayReceiver.close();
  });

  it("surfaces presence for a server-signed reference claim", async () => {
    const reference = uniqueChannelReference("presence");
    const claims = allPermissionClaims(reference);
    const watcher = await connectedChannel(reference, claims);
    const watched = watcher.segment("chat");
    watched.subscribePresence();
    await settle();

    const actor = await connectedChannel(reference, {
      ...claims,
      reference: "jsqual-server-actor",
    });
    actor.segment("chat").subscribe();

    // Join and leave are a typed, segment-tagged frame, not prose.
    const join = await nextPresence(
      watched,
      (event) => event.joined && event.tokenReference === "jsqual-server-actor",
      "the actor's presence join event",
      20_000,
    );
    expect(join.segmentId).toBe("chat");
    expect(join.connectionId.length).toBeGreaterThan(0);

    const page = await watcher
      .segment("chat")
      .presenceList({ page: 1, perPage: 10 });
    expect(page.total).toBeGreaterThanOrEqual(1);
    expect(
      page.connections.some(
        (connection) => connection.tokenReference === "jsqual-server-actor",
      ),
    ).toBe(true);

    await actor.close();
    await watcher.close();
  });
});
