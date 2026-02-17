import { test, expect } from "@playwright/test";

// Each test uses a unique room param to avoid cross-test contamination
// in the shared Durable Object. The room key is derived from location.href,
// so a unique query param isolates each test's DO instance.
let roomCounter = 0;
function uniqueUrl() {
  return `/v1/avatar-stack?_room=${Date.now()}-${roomCounter++}`;
}

test.describe("avatar-stack multi-user presence", () => {
  test("two tabs see two avatars and correct online count", async ({
    browser,
  }) => {
    const url = uniqueUrl();
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Page A connects first — should see 1 avatar
      await pageA.goto(url);
      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(1, { timeout: 10_000 });
      await expect(pageA.locator("#userCount")).toHaveText("1 online");

      // Page B connects — both should see 2 avatars
      await pageB.goto(url);
      await expect(
        pageB.locator("#avatarStack .avatar.entered")
      ).toHaveCount(2, { timeout: 10_000 });
      await expect(pageB.locator("#userCount")).toHaveText("2 online");

      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(2, { timeout: 10_000 });
      await expect(pageA.locator("#userCount")).toHaveText("2 online");

      // Each page marks exactly one avatar as current user
      await expect(
        pageA.locator("#avatarStack .avatar.current-user")
      ).toHaveCount(1);
      await expect(
        pageB.locator("#avatarStack .avatar.current-user")
      ).toHaveCount(1);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test("closing one tab reduces avatars on the remaining tab", async ({
    browser,
  }) => {
    const url = uniqueUrl();
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await pageA.goto(url);
      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(1, { timeout: 10_000 });

      await pageB.goto(url);
      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(2, { timeout: 10_000 });
      await expect(
        pageB.locator("#avatarStack .avatar.entered")
      ).toHaveCount(2, { timeout: 10_000 });

      // Close page B — page A should drop to 1 avatar
      await contextB.close();

      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(1, { timeout: 10_000 });
      await expect(pageA.locator("#userCount")).toHaveText("1 online");
    } finally {
      await contextA.close();
    }
  });
});

test.describe("avatar-stack presence bugs", () => {
  // Bug 1: Room splitting via document.referrer
  // Two visitors to the same URL should share a room regardless of
  // how they navigated there (different referrers).
  test("visitors with different referrers share the same room", async ({
    browser,
  }) => {
    const url = uniqueUrl();
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Page A arrives from a blog post link (has referrer)
      await pageA.goto(url, { referer: "https://blog.example.com/post-1" });
      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(1, { timeout: 10_000 });

      // Page B arrives directly (no referrer)
      await pageB.goto(url);

      // Both should see 2 avatars — same room despite different referrers
      await expect(
        pageB.locator("#avatarStack .avatar.entered")
      ).toHaveCount(2, { timeout: 10_000 });
      await expect(pageB.locator("#userCount")).toHaveText("2 online");

      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(2, { timeout: 10_000 });
      await expect(pageA.locator("#userCount")).toHaveText("2 online");
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  // Bug 2: Duplicate avatars when same player has multiple sockets.
  // A user who duplicates their tab (same playerId via sessionStorage)
  // should appear as ONE avatar, not two.
  test("same player with two tabs appears as one avatar", async ({
    browser,
  }) => {
    const url = uniqueUrl();
    const sharedPlayerId = "test-player-" + Date.now();

    // Both contexts pre-set the same playerId in sessionStorage
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Inject the same playerId before page scripts run
      await pageA.addInitScript(
        (id) => sessionStorage.setItem("embeds_player_id", id),
        sharedPlayerId
      );
      await pageB.addInitScript(
        (id) => sessionStorage.setItem("embeds_player_id", id),
        sharedPlayerId
      );

      await pageA.goto(url);
      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(1, { timeout: 10_000 });
      await expect(pageA.locator("#userCount")).toHaveText("1 online");

      await pageB.goto(url);

      // Should still show 1 avatar — same player, deduplicated
      await expect(
        pageB.locator("#avatarStack .avatar.entered")
      ).toHaveCount(1, { timeout: 10_000 });
      await expect(pageB.locator("#userCount")).toHaveText("1 online");

      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(1, { timeout: 10_000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  // Bug 3: Closing one of a player's tabs should NOT remove the avatar.
  // player_left should only broadcast when the LAST socket for a
  // playerId disconnects.
  test("closing one tab of a multi-tab player keeps their avatar", async ({
    browser,
  }) => {
    const url = uniqueUrl();
    const sharedPlayerId = "test-player-" + Date.now();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const contextC = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const pageC = await contextC.newPage();

    try {
      // Player 1 has two tabs (A and B) with the same playerId
      await pageA.addInitScript(
        (id) => sessionStorage.setItem("embeds_player_id", id),
        sharedPlayerId
      );
      await pageB.addInitScript(
        (id) => sessionStorage.setItem("embeds_player_id", id),
        sharedPlayerId
      );
      // Player 2 (C) has a different playerId (default random UUID)

      await pageA.goto(url);
      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(1, { timeout: 10_000 });

      await pageB.goto(url);
      // Still 1 avatar (player 1, deduplicated)
      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(1, { timeout: 10_000 });

      await pageC.goto(url);
      // 2 avatars: player 1 + player 2
      await expect(
        pageC.locator("#avatarStack .avatar.entered")
      ).toHaveCount(2, { timeout: 10_000 });
      await expect(pageC.locator("#userCount")).toHaveText("2 online");

      // Close player 1's second tab — player 1 still has tab A open
      await contextB.close();

      // Player 2 (C) should still see 2 avatars (player 1 is still connected via tab A)
      await expect(
        pageC.locator("#avatarStack .avatar.entered")
      ).toHaveCount(2, { timeout: 10_000 });
      await expect(pageC.locator("#userCount")).toHaveText("2 online");

      // Player 1 (A) should also still see 2 avatars
      await expect(
        pageA.locator("#avatarStack .avatar.entered")
      ).toHaveCount(2, { timeout: 10_000 });
    } finally {
      await contextA.close();
      await contextC.close();
    }
  });
});
