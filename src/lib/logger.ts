// Minimal structured logging for the automation flows (discovery, tailoring,
// send/submit). Emits one JSON line per event so failures are debuggable from
// the server console without opening dev tools.

type Level = "info" | "warn" | "error";
type Fields = Record<string, unknown>;

function emit(level: Level, scope: string, message: string, fields?: Fields) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(fields ?? {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (scope: string, message: string, fields?: Fields) =>
    emit("info", scope, message, fields),
  warn: (scope: string, message: string, fields?: Fields) =>
    emit("warn", scope, message, fields),
  error: (scope: string, message: string, fields?: Fields) =>
    emit("error", scope, message, fields),
};
