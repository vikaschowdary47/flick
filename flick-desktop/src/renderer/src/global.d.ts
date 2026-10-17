interface Window {
  flick: {
    getFiles: () => Promise<import('../../shared/files').FileCard[]>
    onFilesDropped: (
      listener: (result: import('../../shared/files').DroppedFilesResult) => void,
    ) => () => void
    removeFile: (fileId: string) => Promise<boolean>
    saveReceivedFile: (name: string, bytes: Uint8Array) => Promise<
      import('../../shared/files').FileCard
    >
    startFileDrag: (fileId: string) => void
  }
}
