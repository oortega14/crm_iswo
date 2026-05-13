/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_BACKEND_ORIGIN: string
  readonly VITE_FRONTEND_PORT?: string
  readonly VITE_TENANT_SLUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
