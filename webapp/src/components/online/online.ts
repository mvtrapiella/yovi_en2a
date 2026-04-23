// src/components/online/online.ts
//
// Typed wrapper around the Rust online endpoints. All calls are routed
// through the Express gateway's /game/* proxy (see users-service.js).

const API_URL: string = (import.meta as any).env?.VITE_API_URL ?? "";

/** All game endpoints live under this gateway prefix. */
const GAME = "/game";

// ---------- Types (mirror the Rust structs in data.rs) ----------

export interface CreateOnlineMatchRequest {
    player1id: string;
    size: number;
    match_id: string;          // "" → server picks a random/public match
    match_password: string;
}

export interface CreateOnlineMatchResponse {
    match_id: string;
    turn_number: number;       // creator = 0
}

export interface JoinOnlineMatchRequest {
    player2id: string;
    match_id: string;          // "" → join any public waiting match
    match_password: string;
}

export interface JoinOnlineMatchResponse {
    match_id: string;
    turn_number: number;       // joiner = 1
}

export interface UpdateOnlineMatchRequest {
    match_id: string;
    turn_number: number;
}

export type Yen = {
    size?: number;
    turn?: number;
    players?: string[];
    layout?: string;
    variant?: string | null;
    [k: string]: unknown;
};

export interface UpdateOnlineMatchResponse {
    match_id: string;
    board_status: Yen;
}

export interface ExecuteMoveRequest {
    match_id: string;
    coord_x: number;
    coord_y: number;
    coord_z: number;
}

export interface ExecuteMoveResponse {
    match_id: string;
    game_over: boolean;
}

export interface MatchStatusResponse {
    match_id: string;
    status: "waiting" | "active" | string;
    player1id: string;
    player2id: string;
    ready: boolean;
}

export interface MatchTurnInfo {
    match_id: string;
    /** Current turn number as the server sees it (0 or 1). */
    turn: number;
    /** ms since epoch, server clock, when the current turn started. */
    turn_started_at: number;
    /** ms since epoch, server clock, at the moment the response was built. */
    now_server: number;
    /** 10_000 in the default build. */
    turn_duration_ms: number;
}

// ---------- Internal helpers ----------

class ApiError extends Error {
    // 1. Explicitly declare the property
    status: number;

    constructor(status: number, message: string) {
        super(message);
        // 2. Manually assign the value
        this.status = status;
        this.name = "ApiError";
    }
}

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(res.status, text || res.statusText);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            res.status,
            `Expected JSON from ${path}, got ${contentType || "unknown"}: ${text.slice(0, 120)}`
        );
    }

    return (await res.json()) as TRes;
}

async function getJson<TRes>(path: string): Promise<TRes> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(res.status, text || res.statusText);
    }
    return (await res.json()) as TRes;
}

// ---------- Public API ----------

export function createOnlineMatch(
    req: CreateOnlineMatchRequest
): Promise<CreateOnlineMatchResponse> {
    return postJson(`${GAME}/createMatch`, req);
}

export function joinOnlineMatch(
    req: JoinOnlineMatchRequest
): Promise<JoinOnlineMatchResponse> {
    return postJson(`${GAME}/joinMatch`, req);
}

export function executeMove(
    req: ExecuteMoveRequest
): Promise<ExecuteMoveResponse> {
    return postJson(`${GAME}/executeMove`, req);
}

export function getMatchStatus(matchId: string): Promise<MatchStatusResponse> {
    return getJson(`${GAME}/matchStatus/${encodeURIComponent(matchId)}`);
}

export function getMatchTurnInfo(matchId: string): Promise<MatchTurnInfo> {
    return getJson(`${GAME}/matchTurnInfo/${encodeURIComponent(matchId)}`);
}

export function isNoMatchesAvailable(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false;
    return /no\s*match/i.test(err.message);
}

export async function waitUntilMatchReady(
    matchId: string,
    intervalMs = 1000,
    signal?: AbortSignal
): Promise<MatchStatusResponse> {
    while (true) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
            const status = await getMatchStatus(matchId);
            if (status.ready) return status;
        } catch (err) {
            if ((err as any)?.name === "AbortError") throw err;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
}

export async function waitForTurn(
    req: UpdateOnlineMatchRequest,
    signal?: AbortSignal
): Promise<UpdateOnlineMatchResponse> {
    while (true) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        try {
            const res = await fetch(`${API_URL}${GAME}/requestOnlineGameUpdate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(req),
                signal,
            });

            if (res.ok) return (await res.json()) as UpdateOnlineMatchResponse;

            if (res.status === 408) continue;

            const text = await res.text().catch(() => "");
            throw new ApiError(res.status, text || res.statusText);
        } catch (err) {
            if ((err as any)?.name === "AbortError") throw err;
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
}

/**
 * Parse the YEN `layout` string into an ordered list of XYZ coordinates.
 * YEN.layout is rows separated by '/', cells are 'B', 'R', or '.' for empty.
 */
export function extractOccupiedFromYen(
    yen: Yen
): Array<{ x: number; y: number; z: number; symbol: string }> {
    if (typeof yen.layout !== "string" || typeof yen.size !== "number") return [];
    const size = yen.size;
    const rows = yen.layout.split("/");
    const out: Array<{ x: number; y: number; z: number; symbol: string }> = [];

    for (let row = 0; row < rows.length; row++) {
        const r = rows[row];
        for (let col = 0; col < r.length; col++) {
            const ch = r[col];
            if (ch === ".") continue;
            const x = size - 1 - row;
            const y = col;
            const z = row - col;
            out.push({ x, y, z, symbol: ch });
        }
    }
    return out;
}

export { ApiError };