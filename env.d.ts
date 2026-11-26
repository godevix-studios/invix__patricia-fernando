/// <reference types="@cloudflare/workers-types" />

// Tipos para el entorno de Cloudflare
interface CloudflareEnvironment {
  DB: D1Database;
  APP_URL: string;
}

// Declaración global para que CloudflareEnvironment esté disponible
declare global {
  interface CloudflareEnvironment {
    DB: D1Database;
    APP_URL: string;
  }
}

// Extender el contexto de React Router
declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: CloudflareEnvironment;
      ctx: ExecutionContext;
    };
  }
}
