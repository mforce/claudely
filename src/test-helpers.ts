const realFetch = globalThis.fetch;

export function captureRealFetch(): typeof fetch {
  return realFetch;
}

export function restoreFetch(): void {
  globalThis.fetch = realFetch;
}

export function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }): void {
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({}),
    ...response,
  })) as typeof fetch;
}
