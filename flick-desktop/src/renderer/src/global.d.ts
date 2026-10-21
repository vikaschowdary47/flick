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
    getWindowMode: () => Promise<'popover' | 'panel' | 'main'>
    onWindowMode: (listener: (mode: 'popover' | 'panel' | 'main') => void) => () => void
    openMainWindow: () => void
    hideWindow: () => void
    getAppSettings: () => Promise<{ showAs: 'popover' | 'panel'; canLaunchAtLogin: boolean; launchAtLogin: boolean }>
    setShowAs: (showAs: 'popover' | 'panel') => Promise<void>
    setLaunchAtLogin: (on: boolean) => Promise<void>
    reportPopoverHeight: (height: number, expanded: boolean) => void
    onPopoverExpanded: (listener: (expanded: boolean) => void) => () => void
    setClipsActive: (active: boolean) => Promise<void>
    readClipboard: () => Promise<string>
    writeClipboard: (text: string) => Promise<void>
    onSendClipboardText: (listener: (text: string) => void) => () => void
    openAuthUrl: (authUrl: string) => Promise<void>
    onAuthCallback: (listener: (url: string) => void) => () => void
    getDefaultDevice: () => Promise<{ name: string; platform: string }>
  }
}
