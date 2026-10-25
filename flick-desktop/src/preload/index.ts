import type { DesktopAppSettings, ArrivalNotice } from '../shared/appSettings'
import { contextBridge, ipcRenderer } from 'electron'
import type {
  DroppedFilesResult,
  FileCard,
  ReceivedFileInput,
} from '../shared/files'
import { APP_NAME } from '../shared/appName'

type FilesDroppedListener = (result: DroppedFilesResult) => void

const filesDroppedListeners = new Set<FilesDroppedListener>()
const authCallbackListeners = new Set<(url: string) => void>()
const pendingAuthCallbacks: string[] = []
let pendingSettingsOpen = false
const settingsListeners = new Set<() => void>()
ipcRenderer.on('settings:open', () => {
  if (!settingsListeners.size) pendingSettingsOpen = true
  else for (const listener of Array.from(settingsListeners)) listener()
})

ipcRenderer.on('auth:callback', (_event, value: unknown) => {
  if (typeof value !== 'string' || !value.startsWith('flick://auth-callback')) {
    return
  }
  if (authCallbackListeners.size === 0) {
    pendingAuthCallbacks.push(value)
    return
  }
  for (const listener of Array.from(authCallbackListeners)) listener(value)
})

function isFileCard(value: unknown): value is FileCard {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'size' in value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.size === 'number'
  )
}

function notifyFilesDropped(result: DroppedFilesResult): void {
  for (const listener of Array.from(filesDroppedListeners)) {
    try {
      listener(result)
    } catch (error) {
      console.error(`${APP_NAME} file-drop listener failed:`, error)
    }
  }
}

ipcRenderer.on('files:added', (_event, value: unknown) => {
  if (!Array.isArray(value) || !value.every(isFileCard)) {
      console.error(`${APP_NAME} received an invalid file-list update.`)
    return
  }

  notifyFilesDropped({ files: value, rejected: [] })
})

document.addEventListener(
  'dragover',
  (event) => {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
  },
  true,
)

contextBridge.exposeInMainWorld('flick', {
  getFiles: (): Promise<FileCard[]> => ipcRenderer.invoke('files:list'),
  onFilesDropped: (listener: FilesDroppedListener): (() => void) => {
    filesDroppedListeners.add(listener)
    return () => filesDroppedListeners.delete(listener)
  },
  removeFile: (fileId: string): Promise<boolean> =>
    ipcRenderer.invoke('files:remove', fileId),
  previewFile: (fileId: string): Promise<void> =>
    ipcRenderer.invoke('files:preview', fileId),
  saveReceivedFile: async (
    name: string,
    bytes: Uint8Array,
    id?: string,
  ): Promise<FileCard> => {
    const input: ReceivedFileInput = { name, bytes, id }
    const result: unknown = await ipcRenderer.invoke('files:save-received', input)
    if (!isFileCard(result)) {
      throw new Error(`${APP_NAME} returned an invalid saved-file record.`)
    }
    const file = result
    notifyFilesDropped({ files: [file], rejected: [] })
    return file
  },
  startFileDrag: (fileId: string) => ipcRenderer.send('file:start-drag', fileId),
  endFileDrag: () => ipcRenderer.send('file:drag-ended'),
  notifyArrival: (notice?: ArrivalNotice) => ipcRenderer.send('tray:arrival', notice),
  getWindowMode: (): Promise<'popover' | 'panel' | 'main'> => ipcRenderer.invoke('window:get-mode'),
  onWindowMode: (listener: (mode: 'popover' | 'panel' | 'main') => void): (() => void) => {
    const handler = (_event: unknown, mode: unknown) =>
      listener(mode === 'panel' || mode === 'main' ? mode : 'popover')
    ipcRenderer.on('window:mode', handler)
    return () => ipcRenderer.removeListener('window:mode', handler)
  },
  openMainWindow: () => ipcRenderer.send('window:open-main'),
  hideWindow: () => ipcRenderer.send('window:hide'),
  getAppSettings: (): Promise<DesktopAppSettings> =>
    ipcRenderer.invoke('settings:get-app'),
  setShowAs: (showAs: 'popover' | 'panel'): Promise<void> => ipcRenderer.invoke('settings:set-show-as', showAs),
  setLaunchAtLogin: (on: boolean): Promise<DesktopAppSettings> => ipcRenderer.invoke('settings:set-launch-at-login', on),
  setShortcut: (shortcut: string): Promise<{ error: string | null; settings: DesktopAppSettings }> => ipcRenderer.invoke('settings:set-shortcut', shortcut),
  onOpenSettings: (listener: () => void): (() => void) => {
    settingsListeners.add(listener)
    if (pendingSettingsOpen) { pendingSettingsOpen = false; listener() }
    return () => { settingsListeners.delete(listener) }
  },
  reportPopoverHeight: (height: number, expanded: boolean) =>
    ipcRenderer.send('popover:content-height', height, expanded),
  onPopoverExpanded: (listener: (expanded: boolean) => void): (() => void) => {
    const handler = (_event: unknown, expanded: unknown) => listener(expanded === true)
    ipcRenderer.on('popover:expanded', handler)
    return () => ipcRenderer.removeListener('popover:expanded', handler)
  },
  setClipsActive: (active: boolean): Promise<void> =>
    ipcRenderer.invoke('clips:set-active', active),
  readClipboard: (): Promise<string> => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text: string): Promise<void> => ipcRenderer.invoke('clipboard:write', text),
  onSendClipboardText: (listener: (text: string) => void): (() => void) => {
    const handler = (_event: unknown, text: unknown) =>
      listener(typeof text === 'string' ? text : '')
    ipcRenderer.on('clips:send-text', handler)
    return () => ipcRenderer.removeListener('clips:send-text', handler)
  },
  getDefaultDevice: (): Promise<{ name: string; platform: string }> =>
    ipcRenderer.invoke('device:default'),
  setAccountActive: (active: boolean): Promise<void> => ipcRenderer.invoke('account:set-active', active),
  clearAccountData: (): Promise<void> => ipcRenderer.invoke('account:clear-local-data'),
  openAuthUrl: (authUrl: string): Promise<void> =>
    ipcRenderer.invoke('auth:open-external', authUrl),
  onAuthCallback: (listener: (url: string) => void): (() => void) => {
    authCallbackListeners.add(listener)
    while (pendingAuthCallbacks.length > 0) {
      listener(pendingAuthCallbacks.shift() as string)
    }
    return () => authCallbackListeners.delete(listener)
  },
})
