
interface ImportMetaEnv {
  readonly VITE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const process: {
  env: {
    [key: string]: string | undefined
  }
}
