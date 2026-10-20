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
    getClipboardSharing: () => Promise<boolean>
    setClipboardSharing: (on: boolean) => Promise<void>
    onClipboardSharingChanged: (listener: (on: boolean) => void) => () => void
    readClipboard: () => Promise<string>
    writeClipboard: (text: string) => Promise<void>
    onSendClipboardText: (listener: (text: string) => void) => () => void
    startAuthLoopback: () => Promise<string>
    getDefaultDevice: () => Promise<{ name: string; platform: string }>
    waitForAuthCode: (authUrl: string) => Promise<string>
  }
}
