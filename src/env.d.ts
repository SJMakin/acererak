/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_KEY: string;
  // Add other env vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
