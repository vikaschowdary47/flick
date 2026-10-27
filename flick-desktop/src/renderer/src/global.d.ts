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
    notifyArrival: (notice?: import('../../shared/appSettings').ArrivalNotice) => void
    getWindowMode: () => Promise<'popover' | 'panel' | 'main'>
    onWindowMode: (listener: (mode: 'popover' | 'panel' | 'main') => void) => () => void
    openMainWindow: () => void
    hideWindow: () => void
    getAppSettings: () => Promise<import('../../shared/appSettings').DesktopAppSettings>
    setShowAs: (showAs: 'popover' | 'panel') => Promise<void>
    setLaunchAtLogin: (on: boolean) => Promise<import('../../shared/appSettings').DesktopAppSettings>
    setShortcut: (shortcut: string) => Promise<{ error: string | null; settings: import('../../shared/appSettings').DesktopAppSettings }>
    onOpenSettings: (listener: () => void) => () => void
    reportPopoverHeight: (height: number, expanded: boolean) => void
    onPopoverExpanded: (listener: (expanded: boolean) => void) => () => void
    setClipsActive: (active: boolean) => Promise<void>
    readClipboard: () => Promise<string>
    writeClipboard: (text: string) => Promise<void>
    onSendClipboardText: (listener: (text: string) => void) => () => void
    setAccountActive: (active: boolean) => Promise<void>
    clearAccountData: () => Promise<void>
    openAuthUrl: (authUrl: string) => Promise<void>
    onAuthCallback: (listener: (url: string) => void) => () => void
    getDefaultDevice: () => Promise<{ name: string; platform: string }>
    getClipHistory: () => Promise<import('../../shared/appSettings').ClipHistoryState>
    setClipHistoryEnabled: (on: boolean) => Promise<import('../../shared/appSettings').ClipHistoryState>
    removeClipHistoryEntry: (id: string) => Promise<import('../../shared/appSettings').ClipHistoryState>
    pinClipHistoryEntry: (id: string, pinned: boolean) => Promise<import('../../shared/appSettings').ClipHistoryState>
    clearClipHistory: () => Promise<import('../../shared/appSettings').ClipHistoryState>
    onClipHistory: (listener: (state: import('../../shared/appSettings').ClipHistoryState) => void) => () => void
  }
}
