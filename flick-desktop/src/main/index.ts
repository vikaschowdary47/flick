import {
  app,
  BrowserWindow,
  type IpcMainInvokeEvent,
  ipcMain,
  nativeImage,
  shell,
  type NativeImage,
} from "electron";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import {
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DroppedFileInput,
  DroppedFilesResult,
  FileCard,
  ReceivedFileInput,
} from "../shared/files";
import { windowsFileName } from "./windows-behavior";
import { findAuthCallback, isAuthCallbackUrl } from "./auth-links";
import { notifyWindowsArrival } from "./notifications";
import { designTokens } from "../design/tokens";
import { setupClips } from "./clips";
import { APP_NAME } from "../shared/appName";
import {
  attachWindow,
  noteArrival,
  setDragInProgress,
  setupTray,
  setupWindowModeIpc,
  showPopover,
} from "./tray";

app.setName(APP_NAME);
if (process.platform === "win32") app.setAppUserModelId("dev.flickit.desktop");

const currentDirectory = fileURLToPath(new URL(".", import.meta.url));
const isDevelopment = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let demoFileIcon: NativeImage;
type RegisteredFile = FileCard & { path: string };
interface SavedFileRegistry {
  version: 1;
  files: RegisteredFile[];
  ignoredPaths: string[];
}
let files = new Map<string, RegisteredFile>();
let fileIdsByPath = new Map<string, string>();
let ignoredPaths = new Set<string>();
let fileMutationQueue: Promise<void> = Promise.resolve();
let accountCacheBlocked = false;

const registryPath = join(app.getPath("userData"), "files.json");
let pendingAuthCallback: string | null = null;

function flushAuthCallback(): void {
  if (!pendingAuthCallback || !mainWindow || mainWindow.webContents.isLoadingMainFrame()) {
    return;
  }
  const callback = pendingAuthCallback;
  pendingAuthCallback = null;
  mainWindow.webContents.send("auth:callback", callback);
}

function handleAuthCallback(value: string): void {
  if (!isAuthCallbackUrl(value)) {
    return;
  }
  pendingAuthCallback = value;
  flushAuthCallback();
  if (mainWindow) {
    if (process.platform === "win32") showPopover();
    else { mainWindow.show(); mainWindow.focus(); }
  }
}

function registerProtocol(): void {
  if (isDevelopment && process.argv[1]) {
    app.setAsDefaultProtocolClient("eqlshare", process.execPath, [resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient("eqlshare");
  }
}

function createDemoFileIcon(): NativeImage {
  const size = 64;
  const bitmap = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nearestX = Math.max(14, Math.min(49, x));
      const nearestY = Math.max(14, Math.min(49, y));
      const inBackground = (x - nearestX) ** 2 + (y - nearestY) ** 2 <= 14 ** 2;
      const inPage =
        x >= 20 &&
        x <= 48 &&
        y >= 12 &&
        y <= 52 &&
        !(x > 36 && y < 12 + x - 36);

      if (!inBackground) {
        continue;
      }

      const offset = (y * size + x) * 4;
      const isFold = x > 36 && y >= 12 + x - 36 && y < 24;
      const isText =
        (y >= 33 && y <= 35 && x >= 27 && x <= 41) ||
        (y >= 40 && y <= 42 && x >= 27 && x <= 41) ||
        (y >= 47 && y <= 49 && x >= 27 && x <= 37);
      const color = inPage
        ? isText
          ? [246, 115, 129, 255]
          : isFold
          ? [230, 227, 255, 255]
          : [255, 255, 255, 255]
        : [246, 115, 129, 255];

      bitmap[offset] = color[2];
      bitmap[offset + 1] = color[1];
      bitmap[offset + 2] = color[0];
      bitmap[offset + 3] = color[3];
    }
  }

  return nativeImage.createFromBitmap(bitmap, { width: size, height: size });
}

function assertMainWindow(event: IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error(`File operations are only available to the ${APP_NAME} window.`);
  }
}

function listFiles(): FileCard[] {
  return Array.from(files.values(), ({ id, name, size }) => ({ id, name, size }));
}

function isRegisteredFile(value: unknown): value is RegisteredFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "path" in value &&
    "size" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.path === "string" &&
    typeof value.size === "number"
  );
}

async function saveFiles(
  nextFiles: Map<string, RegisteredFile>,
  nextIgnoredPaths: Set<string> = ignoredPaths,
): Promise<void> {
  await mkdir(join(app.getPath("userData")), { recursive: true });
  const temporaryPath = `${registryPath}.${randomUUID()}.tmp`;
  const registry: SavedFileRegistry = {
    version: 1,
    files: Array.from(nextFiles.values()),
    ignoredPaths: Array.from(nextIgnoredPaths),
  };
  const serializedFiles = JSON.stringify(registry, null, 2);
  await writeFile(temporaryPath, serializedFiles, "utf8");
  await rename(temporaryPath, registryPath);
}

function serializeFileMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = fileMutationQueue.then(operation);
  fileMutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function loadFiles(): Promise<void> {
  let serializedFiles: string;
  try {
    serializedFiles = await readFile(registryPath, "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      files = new Map();
      fileIdsByPath = new Map();
      return;
    }
    throw error;
  }

  const storedFiles: unknown = JSON.parse(serializedFiles);
  const legacyFiles = Array.isArray(storedFiles);
  const registry = storedFiles as Partial<SavedFileRegistry>;
  if (
    legacyFiles
      ? !storedFiles.every(isRegisteredFile)
      : registry.version !== 1 ||
        !Array.isArray(registry.files) ||
        !registry.files.every(isRegisteredFile) ||
        !Array.isArray(registry.ignoredPaths) ||
        !registry.ignoredPaths.every((path) => typeof path === "string")
  ) {
    throw new Error(`${APP_NAME}'s saved file list is invalid: ${registryPath}`);
  }
  const fileRecords = legacyFiles ? storedFiles : registry.files!;
  const restoredIgnoredPaths = new Set(legacyFiles ? [] : registry.ignoredPaths);

  const restoredFiles = new Map<string, RegisteredFile>();
  const restoredPaths = new Map<string, string>();

  for (const storedFile of fileRecords) {
    try {
      const path = await realpath(storedFile.path);
      const fileStats = await stat(path);
      if (!fileStats.isFile()) {
        console.warn(`Skipping saved item because it is no longer a file: ${storedFile.name}`);
        continue;
      }
      if (restoredPaths.has(path)) {
        continue;
      }

      const file = {
        id: storedFile.id,
        name: basename(path),
        path,
        size: fileStats.size,
      };
      restoredFiles.set(file.id, file);
      restoredPaths.set(path, file.id);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error.code === "ENOENT" || error.code === "EACCES" || error.code === "EPERM")
      ) {
        console.warn(`Skipping unavailable saved file "${storedFile.name}": ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  await saveFiles(restoredFiles, restoredIgnoredPaths);
  files = restoredFiles;
  fileIdsByPath = restoredPaths;
  ignoredPaths = restoredIgnoredPaths;
}

function isDroppedFileInput(item: unknown): item is DroppedFileInput {
  return (
    typeof item === "object" &&
    item !== null &&
    "name" in item &&
    "path" in item &&
    typeof item.name === "string" &&
    typeof item.path === "string"
  );
}

function isReceivedFileInput(item: unknown): item is ReceivedFileInput {
  return (
    typeof item === "object" &&
    item !== null &&
    "name" in item &&
    "bytes" in item &&
    typeof item.name === "string" &&
    item.bytes instanceof Uint8Array &&
    (!("id" in item) || typeof item.id === "string")
  );
}

function sanitizeReceivedFileName(name: string): string {
  const safeName = basename(name.split("\\").join("/")).trim();
  if (!safeName || safeName === "." || safeName === "..") {
    throw new TypeError("A valid file name is required.");
  }
  return Array.from(safeName, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? "_" : character;
  }).join("");
}

async function saveReceivedFile(input: unknown): Promise<FileCard> {
  if (!isReceivedFileInput(input)) {
    throw new TypeError("A file name and Uint8Array of file bytes are required.");
  }

  return serializeFileMutation(async () => {
    if (accountCacheBlocked) throw new Error("Account cache is closed.");
    const sanitizedName = sanitizeReceivedFileName(input.name);
    const fileName = process.platform === "win32" ? windowsFileName(sanitizedName) : sanitizedName;
    const fileId = input.id ?? randomUUID();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileId)) {
      throw new TypeError("A valid UUID is required for the saved file ID.");
    }
    if (files.has(fileId)) {
      throw new Error(`A local file is already registered with ID "${fileId}".`);
    }
    const downloadsDirectory = join(app.getPath("userData"), "downloads");
    await mkdir(downloadsDirectory, { recursive: true });

    const extension = extname(fileName);
    const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
    const contents = Buffer.from(input.bytes);
    let path = join(downloadsDirectory, fileName);
    let suffix = 1;

    while (true) {
      try {
        await writeFile(path, contents, { flag: "wx" });
        break;
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "EEXIST"
        ) {
          path = join(downloadsDirectory, `${baseName} (${suffix})${extension}`);
          suffix += 1;
          continue;
        }
        throw error;
      }
    }

    try {
      const fileStats = await stat(path);
      const file: RegisteredFile = {
        id: fileId,
        name: basename(path),
        path,
        size: fileStats.size,
      };
      const nextFiles = new Map(files);
      nextFiles.set(file.id, file);
      const nextIgnoredPaths = new Set(ignoredPaths);
      nextIgnoredPaths.delete(path);

      await saveFiles(nextFiles, nextIgnoredPaths);
      files = nextFiles;
      fileIdsByPath = new Map(fileIdsByPath).set(path, file.id);
      ignoredPaths = nextIgnoredPaths;

      return { id: file.id, name: file.name, size: file.size };
    } catch (error) {
      try {
        await unlink(path);
      } catch (cleanupError) {
        console.error(`Could not clean up unregistered file "${path}":`, cleanupError);
      }
      throw error;
    }
  });
}

async function addDroppedFiles(input: unknown): Promise<DroppedFilesResult> {
  if (!Array.isArray(input)) {
    throw new TypeError("Dropped files must be provided as a list.");
  }

  return serializeFileMutation(async () => {
    const result: DroppedFilesResult = { files: [], rejected: [] };
    const nextFiles = new Map(files);
    const nextPaths = new Map(fileIdsByPath);
    const nextIgnoredPaths = new Set(ignoredPaths);

    for (const item of input) {
      if (!isDroppedFileInput(item)) {
        result.rejected.push({
          name: "Dropped item",
          reason: `${APP_NAME} could not read this item.`,
        });
        continue;
      }

      const { name, path } = item;

      if (!path) {
        result.rejected.push({ name, reason: "Could not read this file from the drop." });
        continue;
      }

      let absolutePath: string;
      let fileStats: Awaited<ReturnType<typeof stat>>;

      try {
        absolutePath = await realpath(path);
        fileStats = await stat(absolutePath);
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          (error.code === "ENOENT" || error.code === "EACCES" || error.code === "EPERM")
        ) {
          console.warn(`Unable to access dropped file "${name}": ${error.message}`);
          result.rejected.push({ name, reason: "This file could not be accessed." });
          continue;
        }

        throw error;
      }

      if (!fileStats.isFile()) {
        result.rejected.push({ name, reason: `Only files can be added to ${APP_NAME}.` });
        continue;
      }

      const existingId = nextPaths.get(absolutePath);
      if (existingId) {
        nextIgnoredPaths.delete(absolutePath);
        const existingFile = nextFiles.get(existingId);
        if (existingFile) {
          result.files.push({
            id: existingFile.id,
            name: existingFile.name,
            size: existingFile.size,
          });
        }
        continue;
      }

      const file = {
        id: randomUUID(),
        name: basename(absolutePath),
        path: absolutePath,
        size: fileStats.size,
      };
      nextFiles.set(file.id, file);
      nextPaths.set(absolutePath, file.id);
      nextIgnoredPaths.delete(absolutePath);
      result.files.push({ id: file.id, name: file.name, size: file.size });
    }

    if (
      nextFiles.size !== files.size ||
      nextIgnoredPaths.size !== ignoredPaths.size
    ) {
      await saveFiles(nextFiles, nextIgnoredPaths);
      files = nextFiles;
      fileIdsByPath = nextPaths;
      ignoredPaths = nextIgnoredPaths;
    }

    return result;
  });
}

// Only files Flick downloaded itself may be deleted from disk. Files the user
// dropped in from elsewhere (Finder, other apps) are never touched.
async function deleteDownloadedCopy(path: string): Promise<void> {
  const downloadsDirectory = resolve(app.getPath("userData"), "downloads");
  const relativePath = relative(downloadsDirectory, resolve(path));
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return;
  }
  try {
    await unlink(resolve(path));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Could not delete downloaded copy "${path}":`, error);
    }
  }
}

async function removeFile(fileId: unknown): Promise<boolean> {
  if (typeof fileId !== "string") {
    throw new TypeError("A valid file ID is required.");
  }

  return serializeFileMutation(async () => {
    const file = files.get(fileId);
    if (!file) {
      return false;
    }

    const nextFiles = new Map(files);
    const nextPaths = new Map(fileIdsByPath);
    const nextIgnoredPaths = new Set(ignoredPaths);
    nextFiles.delete(fileId);
    nextPaths.delete(file.path);
    nextIgnoredPaths.add(file.path);

    await saveFiles(nextFiles, nextIgnoredPaths);
    files = nextFiles;
    fileIdsByPath = nextPaths;
    ignoredPaths = nextIgnoredPaths;
    await deleteDownloadedCopy(file.path);
    return true;
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: Number.parseInt(designTokens.layout.widgetWidth, 10),
    height: Number.parseInt(designTokens.layout.widgetHeight, 10),
    // minWidth: 360,
    // maxWidth: 360,
    // minHeight: 280,
    // maxHeight: 280,
    title: APP_NAME,
    ...(process.platform === "win32" ? { icon: (app.isPackaged ? join(process.resourcesPath, "icon.ico") : join(app.getAppPath(), "build/icon.ico")) } : {}),
    show: false, // shown under the tray icon once ready
    skipTaskbar: true,
    alwaysOnTop: true,
    frame: false,
    resizable: true,
    // macOS: a transparent, shadowless window so only our rounded card shows
    // (otherwise the system's own corners, border and shadow peek out around it).
    // Windows keeps a solid window: transparent windows can't be resized there.
    ...(process.platform === "darwin"
      ? { transparent: true, backgroundColor: "#00000000", hasShadow: false }
      : { backgroundColor: designTokens.colors.cream }),
    webPreferences: {
      preload: join(currentDirectory, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(currentDirectory, "../renderer/index.html"));
  }

  attachWindow(mainWindow, () => isQuitting);
  mainWindow.once("ready-to-show", () => {
    const backgroundStartup = process.platform === "win32" && process.argv.includes("--hidden") && !findAuthCallback(process.argv);
    if (!backgroundStartup || pendingAuthCallback) showPopover();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Default device name from the system ("Vikas's MacBook Pro"), used once
// when this computer registers itself in Supabase.
function computerName(): Promise<string> {
  const fallback = hostname().replace(/\.local$/i, "").replace(/[-_]+/g, " ").trim();
  if (process.platform !== "darwin") {
    return Promise.resolve(fallback);
  }
  return new Promise((resolveName) => {
    execFile("/usr/sbin/scutil", ["--get", "ComputerName"], (error, stdout) => {
      resolveName(!error && stdout.trim() ? stdout.trim() : fallback);
    });
  });
}

ipcMain.handle("device:default", async (event) => {
  assertMainWindow(event);
  const platform =
    process.platform === "darwin"
      ? "macos"
      : process.platform === "win32"
        ? "windows"
        : process.platform === "linux"
          ? "linux"
          : "other";
  return { name: (await computerName()) || "Computer", platform };
});

ipcMain.handle("account:set-active", (event, active: unknown) => {
  assertMainWindow(event);
  accountCacheBlocked = active !== true;
});
ipcMain.handle("account:clear-local-data", async (event) => {
  assertMainWindow(event);
  accountCacheBlocked = true;
  await serializeFileMutation(async () => {
    // Fixed app-owned directory only; never delete the user's source files.
    await rm(join(app.getPath("userData"), "downloads"), { recursive: true, force: true });
    await saveFiles(new Map(), new Set());
    files.clear(); fileIdsByPath.clear(); ignoredPaths.clear();
  });
  await event.sender.session.clearCache();
});

ipcMain.handle("auth:open-external", async (event, authUrl: unknown) => {
  assertMainWindow(event);
  if (typeof authUrl !== "string" || !authUrl.startsWith("https://")) {
    throw new TypeError("A valid sign-in URL is required.");
  }
  await shell.openExternal(authUrl);
});

ipcMain.on("file:start-drag", (event, fileId: unknown) => {
  if (typeof fileId !== "string") {
    console.error("Cannot start file drag: received an invalid file ID.");
    return;
  }

  const file = files.get(fileId);
  if (!file) {
    console.error(`Cannot start file drag: file "${fileId}" is not available.`);
    return;
  }

  setDragInProgress(true);
  event.sender.startDrag({
    file: file.path,
    icon: demoFileIcon,
  });
});

// The renderer saw the drag end (first plain mouse move afterwards).
ipcMain.on("file:drag-ended", () => setDragInProgress(false));

// A new file arrived over Realtime: dot on the tray icon if the popover is closed.
ipcMain.on("tray:arrival", (event, notice: unknown) => {
  assertMainWindow(event);
  const clip = notice && typeof notice === "object" && "kind" in notice && notice.kind === "clip";
  if (process.platform === "win32" || !clip) noteArrival();
  if (!accountCacheBlocked) notifyWindowsArrival(notice, showPopover);
});

ipcMain.handle("files:list", (event) => {
  assertMainWindow(event);
  return listFiles();
});

ipcMain.handle("files:add-dropped", async (event, input: unknown) => {
  assertMainWindow(event);
  return addDroppedFiles(input);
});

ipcMain.handle("files:save-received", async (event, input: unknown) => {
  assertMainWindow(event);
  return saveReceivedFile(input);
});

ipcMain.handle("files:remove", async (event, fileId: unknown) => {
  assertMainWindow(event);
  return removeFile(fileId);
});

ipcMain.handle("files:preview", async (event, fileId: unknown) => {
  assertMainWindow(event);
  if (typeof fileId !== "string") {
    throw new TypeError("A valid file ID is required.");
  }

  const file = files.get(fileId);
  if (!file) {
    throw new Error(`Cannot preview file "${fileId}": it is not available.`);
  }

  if (process.platform === "darwin") {
    mainWindow?.previewFile(file.path, file.name);
    return;
  }

  const error = await shell.openPath(file.path);
  if (error) {
    throw new Error(`Could not open "${file.name}": ${error}`);
  }
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const callback = findAuthCallback(commandLine);
    if (callback) handleAuthCallback(callback);
    else if (process.platform === "win32" && mainWindow && !commandLine.includes("--hidden")) showPopover();
  });

  if (process.platform === "darwin") {
    app.on("open-url", (event, url) => {
      event.preventDefault();
      handleAuthCallback(url);
    });
  }

  app
    .whenReady()
    .then(async () => {
      registerProtocol();
      await loadFiles();
      demoFileIcon = createDemoFileIcon();
      if (demoFileIcon.isEmpty()) {
        throw new Error("Could not create the demo file drag icon.");
      }
      createWindow();
      mainWindow?.webContents.on("did-finish-load", flushAuthCallback);
      setupTray(() => mainWindow);
      setupWindowModeIpc();
      setupClips(() => mainWindow, showPopover);

      const initialCallback = findAuthCallback(process.argv);
      if (initialCallback) handleAuthCallback(initialCallback);

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    })
    .catch((error: unknown) => {
      console.error(`Failed to start ${APP_NAME} desktop:`, error);
      app.quit();
    });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
