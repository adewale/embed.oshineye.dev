import { getIdentity } from "./identity";
import type { PlayerIdentity } from "./identity";

interface PlayerInfo extends PlayerIdentity {
  id: string;
}

/**
 * PresenceRoom — a Durable Object that tracks who's currently viewing a page.
 *
 * Uses the hibernatable WebSocket API so the DO can sleep when idle
 * and wake up only when messages arrive or connections close.
 */
export class PresenceRoom implements DurableObject {
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");

    if (!playerId) {
      return new Response("Missing playerId", { status: 400 });
    }

    // Create the WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Compute deterministic identity
    const identity = getIdentity(playerId);
    const playerInfo: PlayerInfo = { id: playerId, ...identity };

    // Accept with hibernation — store player info as tags for retrieval later
    this.ctx.acceptWebSocket(server, [playerId, identity.name, identity.color, identity.initial]);

    // Build current player list from all connected sockets
    const players = this.getPlayers();

    // Send snapshot to the new client (after a microtask so client is ready)
    server.send(JSON.stringify({
      type: "snapshot",
      players: players,
      you: playerId,
    }));

    // Broadcast player_joined to everyone else
    this.broadcast(JSON.stringify({
      type: "player_joined",
      player: playerInfo,
    }), server);

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {
    // Presence-only — no client→server messages needed
  }

  webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    this.handleDisconnect(ws);
  }

  webSocketError(ws: WebSocket, _error: unknown): void {
    this.handleDisconnect(ws);
  }

  private handleDisconnect(ws: WebSocket): void {
    const tags = this.ctx.getTags(ws);
    if (tags.length === 0) return;

    const playerId = tags[0];

    // Broadcast player_left to remaining connections
    this.broadcast(JSON.stringify({
      type: "player_left",
      playerId: playerId,
    }));
  }

  /** Get all currently connected players from WebSocket tags. */
  private getPlayers(): PlayerInfo[] {
    const sockets = this.ctx.getWebSockets();
    const players: PlayerInfo[] = [];

    for (const ws of sockets) {
      const tags = this.ctx.getTags(ws);
      if (tags.length >= 4) {
        players.push({
          id: tags[0],
          name: tags[1],
          color: tags[2],
          initial: tags[3],
        });
      }
    }

    return players;
  }

  /** Send a message to all connected WebSockets, optionally excluding one. */
  private broadcast(message: string, exclude?: WebSocket): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === exclude) continue;
      try {
        ws.send(message);
      } catch {
        // Socket already closed, ignore
      }
    }
  }
}
