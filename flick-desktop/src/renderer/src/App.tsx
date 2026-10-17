import { useEffect, useRef, useState, type DragEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface CloudFile {
  id: string;
  user_id: string;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  delivered_at: string | null;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function isCloudFile(value: unknown): value is CloudFile {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const file = value as Record<string, unknown>;
  return (
    typeof file.id === "string" &&
    typeof file.user_id === "string" &&
    typeof file.name === "string" &&
    typeof file.size === "number" &&
    typeof file.mime_type === "string" &&
    typeof file.storage_path === "string" &&
    typeof file.created_at === "string" &&
    (typeof file.delivered_at === "string" || file.delivered_at === null)
  );
}

export default function App() {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const uploadInProgress = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      setAuthError("");
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    const userId = session?.user.id;
    if (!client || !userId) {
      setFiles([]);
      setIsLoadingFiles(false);
      return;
    }

    let isMounted = true;
    setFiles([]);
    setUploadError("");
    setIsLoadingFiles(true);
    void (async () => {
      try {
        const { data, error } = await client
          .from("files")
          .select(
            "id,user_id,name,size,mime_type,storage_path,created_at,delivered_at",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .returns<CloudFile[]>();
        if (error) {
          throw error;
        }
        if (isMounted) {
          setFiles((currentFiles) => {
            const filesById = new Map(
              data.map((file) => [file.id, file]),
            );
            for (const file of currentFiles) {
              if (file.user_id === userId) {
                filesById.set(file.id, file);
              }
            }
            return Array.from(filesById.values()).sort((left, right) =>
              right.created_at.localeCompare(left.created_at),
            );
          });
        }
      } catch (error: unknown) {
        console.error("Could not load this user's Flick files:", error);
        if (isMounted) {
          setUploadError("Could not load your files. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingFiles(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    const client = supabase;
    const userId = session?.user.id;
    if (!client || !userId) {
      return;
    }

    const channel = client
      .channel(`files:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "files",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.info("New Flick file row:", payload.new);
          const insertedFile = payload.new;
          if (!isCloudFile(insertedFile) || insertedFile.user_id !== userId) {
            console.error("Flick received an invalid file row.");
            return;
          }
          setFiles((currentFiles) => {
            const updatedFiles = [
              insertedFile,
              ...currentFiles.filter((file) => file.id !== insertedFile.id),
            ];
            return updatedFiles.sort((left, right) =>
              right.created_at.localeCompare(left.created_at),
            );
          });
        },
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Flick Realtime subscription failed:", error ?? status);
        }
      });

    return () => {
      void client
        .removeChannel(channel)
        .then((status) => {
          if (status !== "ok") {
            console.error("Could not remove Flick Realtime channel:", status);
          }
        })
        .catch((error: unknown) => {
          console.error("Could not remove Flick Realtime channel:", error);
        });
    };
  }, [session?.user.id]);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setIsSigningIn(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setAuthError(error.message);
      }
    } catch (error: unknown) {
      console.error("Could not sign in to Flick:", error);
      setAuthError(
        error instanceof Error ? error.message : "Could not sign in to Flick.",
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut(): Promise<void> {
    if (!supabase) {
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Could not sign out of Flick:", error);
        setAuthError(error.message);
      }
    } catch (error: unknown) {
      console.error("Could not sign out of Flick:", error);
      setAuthError(
        error instanceof Error ? error.message : "Could not sign out of Flick.",
      );
    }
  }

  async function uploadFiles(selectedFiles: File[]): Promise<void> {
    if (!supabase || !session) {
      setUploadError("Sign in before adding files.");
      return;
    }
    if (uploadInProgress.current || selectedFiles.length === 0) {
      return;
    }

    uploadInProgress.current = true;
    setIsUploading(true);
    setUploadError("");
    const failures: string[] = [];

    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          failures.push(`${file.name} is larger than the 50 MB limit.`);
          continue;
        }

        const safeName = file.name.replace(/[\\/]/g, "_").trim() || "file";
        const storagePath = `${session.user.id}/${crypto.randomUUID()}/${safeName}`;
        let uploadExists = false;
        try {
          const { error: storageError } = await supabase.storage
            .from("flick-files")
            .upload(storagePath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });

          if (storageError) {
            throw storageError;
          }
          uploadExists = true;

          const { data, error: rowError } = await supabase
            .from("files")
            .insert({
              user_id: session.user.id,
              name: safeName,
              size: file.size,
              mime_type: file.type || "application/octet-stream",
              storage_path: storagePath,
            })
            .select(
              "id,user_id,name,size,mime_type,storage_path,created_at,delivered_at",
            )
            .single()
            .returns<CloudFile>();

          if (rowError) {
            throw rowError;
          }

          uploadExists = false;
          setFiles((currentFiles) => [
            data,
            ...currentFiles.filter((currentFile) => currentFile.id !== data.id),
          ]);
        } catch (error: unknown) {
          console.error(`Could not upload "${file.name}":`, error);
          if (uploadExists) {
            try {
              const { error: cleanupError } = await supabase.storage
                .from("flick-files")
                .remove([storagePath]);
              if (cleanupError) {
                console.error(
                  `Could not remove incomplete upload "${storagePath}":`,
                  cleanupError,
                );
              }
            } catch (cleanupError: unknown) {
              console.error(
                `Could not remove incomplete upload "${storagePath}":`,
                cleanupError,
              );
            }
          }
          failures.push(
            `${file.name}: ${
              error instanceof Error ? error.message : "Upload failed."
            }`,
          );
        }
      }
    } finally {
      uploadInProgress.current = false;
      setIsUploading(false);
    }

    if (failures.length > 0) {
      setUploadError(failures.join(" "));
    }
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    void uploadFiles(selectedFiles);
  }

  function handleDragEnter(event: DragEvent<HTMLElement>): void {
    if (!event.dataTransfer.types.includes("Files")) {
      return;
    }
    event.preventDefault();
    dragDepth.current += 1;
    setIsDraggingFiles(true);
  }

  function handleDragOver(event: DragEvent<HTMLElement>): void {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDragLeave(event: DragEvent<HTMLElement>): void {
    if (!event.dataTransfer.types.includes("Files")) {
      return;
    }
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDraggingFiles(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDraggingFiles(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <main
      className={`widget${isDraggingFiles ? " drag-active" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        <div className="drop-overlay" aria-hidden="true">
          Drop files to upload to Flick
        </div>
      )}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <span className="brand-name">flick</span>
        </div>
        <div className="connection">
          {session ? (
            <>
              <span className="connection-dot" />
              <span className="signed-in-email">{session.user.email}</span>
              <button
                className="sign-out-button"
                type="button"
                onClick={() => void handleSignOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <span className="connection-dot" />
              <span>Ready for files</span>
            </>
          )}
        </div>
      </header>

      <section className="content" aria-labelledby="incoming-heading">
        {!authReady && (
          <p className="auth-status" role="status">
            Checking sign-in…
          </p>
        )}
        {authReady && !supabase && (
          <p className="auth-status" role="status">
            Add your Supabase URL and publishable key to .env.local to sign in.
          </p>
        )}
        {authReady && supabase && !session && (
          <form className="auth-form" onSubmit={(event) => void handleSignIn(event)}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="sign-in-button" type="submit" disabled={isSigningIn}>
              {isSigningIn ? "Signing in…" : "Sign in"}
            </button>
            {authError && (
              <p className="auth-error" role="alert">
                {authError}
              </p>
            )}
          </form>
        )}

        {session && (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR SUPABASE FILES</p>
                <h1 id="incoming-heading">
                  {files.length > 0
                    ? "Your files"
                    : isLoadingFiles
                      ? "Loading your files…"
                      : "No files yet"}
                </h1>
              </div>
              <div className="file-actions">
                <span className="count">{files.length}</span>
                <button
                  className="add-file-button"
                  type="button"
                  aria-label="Choose files to upload"
                  title="Choose files to upload"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  +
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              multiple
              onChange={handleFileSelection}
              aria-label="Choose files to upload"
            />
            {files.length > 0 && (
              <div className="files-list">
                {files.map((file) => (
                  <div className="file-card" key={file.id}>
                    <span className="file-icon" aria-hidden="true">
                      <span className="file-fold" />
                      <span className="file-lines">
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                    <span className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-meta">
                        {formatFileSize(file.size)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {files.length === 0 && !isLoadingFiles && (
              <div className="empty-files">
                <p>or drag and drop a file here</p>
                <button
                  className="choose-files-button"
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? "Uploading…" : "Choose files"}
                </button>
              </div>
            )}
            {files.length === 0 && isLoadingFiles && (
              <p className="auth-status" role="status">
                Loading your files…
              </p>
            )}
            {files.length > 0 && isUploading && (
              <p className="auth-status" role="status">
                Uploading…
              </p>
            )}
            {uploadError && (
              <p className="auth-error" role="alert">
                {uploadError}
              </p>
            )}
          </>
        )}
      </section>

      <footer className="footer">
        <span className="device-icon" aria-hidden="true">
          ⌕
        </span>
        <span>Files are private to your account</span>
        <span className="footer-status" aria-label="Ready" />
      </footer>
    </main>
  );
}
