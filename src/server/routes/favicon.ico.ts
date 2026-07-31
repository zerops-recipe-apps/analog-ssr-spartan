import { defineEventHandler, setResponseStatus } from 'h3';

/**
 * Short-circuits favicon requests at the Nitro route layer, before they can
 * fall through to Angular's client-side router (which has no route for
 * `/favicon.ico` and throws a NoMatch NG04002 error trying to SSR-render it).
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 204);
  return null;
});
