import { createRequestHandler, RouterContextProvider } from "react-router";
import { setCloudflareContext } from "../app/lib/cloudflare-context";

declare global {
  interface CloudflareEnvironment {
    DB: D1Database;
    APP_URL: string;
  }
}

const requestHandler = createRequestHandler(
  // @ts-expect-error virtual module provided by React Router at build time
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    // Create context provider for React Router 8.x
    const context = new RouterContextProvider();
    
    // Set the cloudflare context using our helper
    setCloudflareContext(context, {
      env,
      ctx: {
        waitUntil: ctx.waitUntil.bind(ctx),
        passThroughOnException: ctx.passThroughOnException.bind(ctx),
      },
      // @ts-ignore - cf types from request
      cf: request.cf,
      caches,
    });

    return requestHandler(request, context);
  },
} satisfies ExportedHandler<CloudflareEnvironment>;
