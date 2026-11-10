/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_ANALYTICS_ENABLED?: string
  readonly VITE_ANALYTICS_SINK?: string
  readonly VITE_ANALYTICS_RECORDING?: string
  readonly VITE_ANALYTICS_RECORDING_SAMPLE_RATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
