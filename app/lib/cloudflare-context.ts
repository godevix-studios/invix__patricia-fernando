import { createContext, type RouterContextProvider } from "react-router";

/**
 * Cloudflare context types
 */
export interface CloudflareContext {
  env: {
    DB: D1Database;
    APP_URL: string;
  };
  ctx: {
    waitUntil: (promise: Promise<unknown>) => void;
    passThroughOnException: () => void;
  };
  cf?: IncomingRequestCfProperties;
  caches: CacheStorage;
}

/**
 * React Router context for Cloudflare bindings
 * This creates a typed context that can be used in loaders/actions
 */
export const cloudflareContextKey = createContext<CloudflareContext>();

/**
 * Helper to set cloudflare context in the RouterContextProvider
 */
export function setCloudflareContext(
  provider: RouterContextProvider,
  value: CloudflareContext
): void {
  provider.set(cloudflareContextKey, value);
}

/**
 * Helper to get cloudflare context from the RouterContextProvider
 */
export function getCloudflareContext(
  context: RouterContextProvider
): CloudflareContext {
  return context.get(cloudflareContextKey);
}
