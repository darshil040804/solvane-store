import "server-only";

// Shared contract for admin server actions. Every action starts with
// getAdminSession() (src/lib/auth/session.ts) and returns "forbidden" without
// touching the database when it is null: actions are reachable by direct POST,
// so the page's requireAdmin() does not protect them.

export type AdminResult<T = object> =
  | ({ status: "ok" } & T)
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "invalid"; errors: Record<string, string> }
  | { status: "conflict"; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isId = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);
