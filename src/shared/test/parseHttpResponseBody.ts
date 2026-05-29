export function parseHttpResponseBody<TBody>(body: string | undefined): TBody {
  if (!body) {
    throw new Error('Response body is required');
  }

  return JSON.parse(body) as TBody;
}
