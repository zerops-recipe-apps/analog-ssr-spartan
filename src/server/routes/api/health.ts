import { defineEventHandler, getRequestIP } from 'h3';

/**
 * Readiness endpoint. Returns the resolved client IP via the
 * `X-Forwarded-For` chain (`getRequestIP(event, { xForwardedFor: true })`)
 * so a plain curl -H check can confirm the app trusts the L7 balancer's
 * forwarded headers, without needing a browser.
 */
export default defineEventHandler((event) => ({
  status: 'ok',
  clientIp: getRequestIP(event, { xForwardedFor: true }) ?? null,
}));
