export type FileRow = {
  id: string;
  user_id: string;
  name: string;
  size: number;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
  delivered_at: string | null;
  pinned: boolean;
  pinned_at: string | null;
  device_id: string | null; // sender
  thumb_path: string | null; // ~200px JPEG for images
};

export type PickedFile = {
  name: string;
  size: number;
  mimeType: string;
};

export type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; file: PickedFile }
  | { kind: "done"; file: PickedFile }
  | { kind: "error"; file: PickedFile | null; message: string };
