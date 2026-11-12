// Browser CORS for the app's Edge Functions.
// The app is served from the Base44 domain, so every function call is
// cross-origin: without these headers the browser blocks the response and
// the app can never reach its backend.
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type Handler = (req: Request) => Promise<Response>;

export function withCors(handler: Handler): Handler {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    const res = await handler(req);
    const headers = new Headers(res.headers);
    for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
    return new Response(res.body, { status: res.status, headers });
  };
}