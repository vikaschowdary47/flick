interface Window {
  flick: {
    getFiles: () => Promise<import('../../shared/files').FileCard[]>
    onFilesDropped: (
      listener: (result: import('../../shared/files').DroppedFilesResult) => void,
    ) => () => void
    removeFile: (fileId: string) => Promise<boolean>
    previewFile: (fileId: string) => Promise<void>
    saveReceivedFile: (
      name: string,
      bytes: Uint8Array,
      id?: string,
    ) => Promise<
      import('../../shared/files').FileCard
    >
    startFileDrag: (fileId: string) => void
    endFileDrag: () => void
    notifyArrival: () => void
    startAuthLoopback: () => Promise<string>
    getDefaultDevice: () => Promise<{ name: string; platform: string }>
    waitForAuthCode: (authUrl: string) => Promise<string>
  }
}
