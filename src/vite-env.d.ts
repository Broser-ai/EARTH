/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROBOFLOW_API_KEY?: string;
  readonly VITE_TINKER_API_KEY?: string;
  readonly VITE_INKLING_WEIGHTS_URI?: string;
  readonly ROBOFLOW_API_KEY?: string;
  readonly TINKER_API_KEY?: string;
  readonly INKLING_WEIGHTS_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
