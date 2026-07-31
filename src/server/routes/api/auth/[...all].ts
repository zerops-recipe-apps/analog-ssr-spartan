import { defineEventHandler, toWebRequest } from 'h3';

import { auth } from '../../../../lib/auth';

/**
 * Bridges Better Auth's framework-agnostic fetch handler onto Analog's Nitro
 * (h3) server. There is no official Angular/Analog adapter for Better Auth —
 * `auth.handler` is a plain `(request: Request) => Promise<Response>`, so
 * any h3-based route can front it by converting the incoming H3Event to a
 * web-standard Request and returning the web-standard Response unchanged.
 * h3 detects the Response return value and sends it as-is (status, headers,
 * body, Set-Cookie included). This mirrors the pattern Better Auth documents
 * for other Nitro-backed meta-frameworks (e.g. Nuxt).
 */
export default defineEventHandler((event) => auth.handler(toWebRequest(event)));
