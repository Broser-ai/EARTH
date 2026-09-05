/// <reference types="vite/client" />

// Adapter credentials must never be VITE_* — Vite inlines those into the SPA bundle.
// Presence is probed server-side (apps/api) or via non-prefixed process.env in Node.
interface ImportMetaEnv {
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
