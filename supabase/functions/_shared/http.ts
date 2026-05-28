export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_POINTS'
  | 'OUT_OF_STOCK'
  | 'INVALID_STATUS'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export function json(data: unknown, status = 200, meta?: Record<string, unknown>): Response {
  return new Response(JSON.stringify(meta ? { data, meta } : { data }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function error(status: number, code: ApiErrorCode, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
