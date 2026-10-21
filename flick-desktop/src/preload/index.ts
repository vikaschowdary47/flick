import { contextBridge, ipcRenderer } from 'electron'
import type {
  DroppedFilesResult,
  FileCard,
  ReceivedFileInput,
} from '../shared/files'

type FilesDroppedListener = (result: DroppedFilesResult) => void

const filesDroppedListeners = new Set<FilesDroppedListener>()

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
      console.error('Flick file-drop listener failed:', error)
    }
  }
}

ipcRenderer.on('files:added', (_event, value: unknown) => {
  if (!Array.isArray(value) || !value.every(isFileCard)) {
    console.error('Flick received an invalid file-list update.')
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
      throw new Error('Flick returned an invalid saved-file record.')
    }
    const file = result
    notifyFilesDropped({ files: [file], rejected: [] })
    return file
  },
  startFileDrag: (fileId: string) => ipcRenderer.send('file:start-drag', fileId),
  endFileDrag: () => ipcRenderer.send('file:drag-ended'),
  notifyArrival: () => ipcRenderer.send('tray:arrival'),
  getWindowMode: (): Promise<'popover' | 'panel' | 'main'> => ipcRenderer.invoke('window:get-mode'),
  onWindowMode: (listener: (mode: 'popover' | 'panel' | 'main') => void): (() => void) => {
    const handler = (_event: unknown, mode: unknown) =>
      listener(mode === 'panel' || mode === 'main' ? mode : 'popover')
    ipcRenderer.on('window:mode', handler)
    return () => ipcRenderer.removeListener('window:mode', handler)
  },
  openMainWindow: () => ipcRenderer.send('window:open-main'),
  hideWindow: () => ipcRenderer.send('window:hide'),
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
  startAuthLoopback: (): Promise<string> => ipcRenderer.invoke('auth:loopback-start'),
  waitForAuthCode: (authUrl: string): Promise<string> =>
    ipcRenderer.invoke('auth:loopback-wait', authUrl),
})
