export interface FileCard {
  id: string
  name: string
  size: number
}

export interface DroppedFileInput {
  name: string
  path: string
}

export interface ReceivedFileInput {
  name: string
  bytes: Uint8Array
  id?: string
}

export interface DroppedFilesResult {
  files: FileCard[]
  rejected: Array<{
    name: string
    reason: string
  }>
}
