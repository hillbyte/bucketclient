import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import type {
  ListObjectsV2CommandOutput,
  _Object,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writable } from "svelte/store";

// Define interfaces
export interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface S3Item {
  key: string;
  name: string;
  lastModified?: Date;
  size?: number;
  type: "folder" | "file";
  contentType?: string;
  url?: string;
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
  file: File;
  key: string;
}

// Create stores
export const s3Config = writable<S3Config | null>(null);
export const s3Client = writable<S3Client | null>(null);
export const isConnected = writable<boolean>(false);
export const currentPath = writable<string>("");
export const s3Items = writable<S3Item[]>([]);
export const isLoading = writable<boolean>(false);
export const uploadProgress = writable<Record<string, UploadProgressEvent>>({});
export const error = writable<string | null>(null);

// Initialize from localStorage
export function initFromLocalStorage(): boolean {
  try {
    const storedConfig = localStorage.getItem("s3Config");
    if (storedConfig) {
      const config = JSON.parse(storedConfig) as S3Config;
      s3Config.set(config);
      initClient(config);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to load S3 config from localStorage:", err);
    return false;
  }
}

// Initialize S3 client
export function initClient(config: S3Config): void {
  try {
    const client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO and some other S3-compatible services
    });

    s3Client.set(client);
    s3Config.set(config);
    localStorage.setItem("s3Config", JSON.stringify(config));
    isConnected.set(true);
    error.set(null);
  } catch (err) {
    console.error("Failed to initialize S3 client:", err);
    error.set(`Failed to initialize S3 client: ${err}`);
    isConnected.set(false);
  }
}

// Disconnect S3 client
export function disconnect(): void {
  s3Client.set(null);
  s3Config.set(null);
  isConnected.set(false);
  localStorage.removeItem("s3Config");
  s3Items.set([]);
  currentPath.set("");
}

// List objects in the bucket
export async function listObjects(prefix: string = ""): Promise<S3Item[]> {
  error.set(null);
  isLoading.set(true);

  try {
    let client: S3Client | null = null;
    let config: S3Config | null = null;

    s3Client.subscribe((value) => (client = value))();
    s3Config.subscribe((value) => (config = value))();

    if (!client || !config) {
      throw new Error("S3 client not initialized");
    }

    // Type assertion to help TypeScript understand this is not null
    const s3 = client as S3Client;
    const s3Config = config as S3Config;

    currentPath.set(prefix);

    const command = new ListObjectsV2Command({
      Bucket: s3Config.bucketName,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response: ListObjectsV2CommandOutput = await s3.send(command);

    // Process folders (CommonPrefixes)
    const folders: S3Item[] = (response.CommonPrefixes || []).map((prefix) => {
      const name = prefix.Prefix!.split("/").filter(Boolean).pop() || "";
      return {
        key: prefix.Prefix!,
        name: name,
        type: "folder",
      };
    });

    // Process files (Contents)
    const files: S3Item[] = (response.Contents || [])
      .filter((item) => item.Key !== prefix) // Filter out the current directory
      .map((item) => {
        const key = item.Key!;
        // Remove the prefix from the key to get just the filename
        const relativePath = key.slice(prefix.length);

        // Skip if this is not a file in the current directory
        if (relativePath.includes("/")) return null;

        return {
          key: key,
          name: relativePath,
          lastModified: item.LastModified,
          size: item.Size,
          type: "file",
        };
      })
      .filter(Boolean) as S3Item[]; // Filter out null values

    const items = [...folders, ...files];
    s3Items.set(items);
    isLoading.set(false);
    return items;
  } catch (err) {
    console.error("Error listing objects:", err);
    error.set(`Error listing objects: ${err}`);
    isLoading.set(false);
    return [];
  }
}

// Get object metadata
export async function getObjectMetadata(
  key: string,
): Promise<Record<string, any> | null> {
  try {
    let client: S3Client | null = null;
    let config: S3Config | null = null;

    s3Client.subscribe((value) => (client = value))();
    s3Config.subscribe((value) => (config = value))();

    if (!client || !config) {
      throw new Error("S3 client not initialized");
    }

    // Type assertion to help TypeScript understand this is not null
    const s3 = client as S3Client;
    const s3Config = config as S3Config;

    const command = new HeadObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    });

    const response = await s3.send(command);
    return {
      contentType: response.ContentType,
      lastModified: response.LastModified,
      size: response.ContentLength,
      metadata: response.Metadata || {},
    };
  } catch (err) {
    console.error("Error getting object metadata:", err);
    error.set(`Error getting object metadata: ${err}`);
    return null;
  }
}

// Get a signed URL for an object
export async function getSignedObjectUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string | null> {
  try {
    let client: S3Client | null = null;
    let config: S3Config | null = null;

    s3Client.subscribe((value) => (client = value))();
    s3Config.subscribe((value) => (config = value))();

    if (!client || !config) {
      throw new Error("S3 client not initialized");
    }

    // Type assertion to help TypeScript understand this is not null
    const s3 = client as S3Client;
    const s3Config = config as S3Config;

    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn });
    return url;
  } catch (err) {
    console.error("Error generating signed URL:", err);
    error.set(`Error generating signed URL: ${err}`);
    return null;
  }
}

// Upload an object
export async function uploadObject(
  file: File,
  key: string,
  metadata: Record<string, string> = {},
): Promise<boolean> {
  try {
    let client: S3Client | null = null;
    let config: S3Config | null = null;

    s3Client.subscribe((value) => (client = value))();
    s3Config.subscribe((value) => (config = value))();

    if (!client || !config) {
      throw new Error("S3 client not initialized");
    }

    // Type assertion to help TypeScript understand this is not null
    const s3 = client as S3Client;
    const s3Config = config as S3Config;

    const contentType = file.type || "application/octet-stream";

    // Initialize progress tracking
    const progressId = `${Date.now()}-${file.name}`;
    uploadProgress.update((progress) => ({
      ...progress,
      [progressId]: {
        loaded: 0,
        total: file.size,
        percentage: 0,
        file,
        key,
      },
    }));

    // Create a readable stream from the file
    const arrayBuffer = await file.arrayBuffer();

    const params: PutObjectCommandInput = {
      Bucket: s3Config.bucketName,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: contentType,
      Metadata: metadata,
    };

    const command = new PutObjectCommand(params);

    // Custom send with progress tracking
    const originalUpload = s3.middlewareStack.clone();

    // Add middleware for tracking progress
    s3.middlewareStack.add(
      (next: any) => async (args: any) => {
        if (args.request.body instanceof Uint8Array) {
          const total = args.request.body.length;
          let loaded = 0;

          // Mock progress updates since we don't have actual upload progress
          const interval = setInterval(() => {
            loaded = Math.min(loaded + Math.floor(total * 0.1), total);
            const percentage = Math.floor((loaded / total) * 100);

            uploadProgress.update((progress) => ({
              ...progress,
              [progressId]: {
                loaded,
                total,
                percentage,
                file,
                key,
              },
            }));

            if (loaded >= total) {
              clearInterval(interval);
            }
          }, 300);
        }

        return next(args);
      },
      {
        step: "build",
        name: "uploadProgressMiddleware",
      },
    );

    await s3.send(command);

    // Complete progress
    uploadProgress.update((progress) => ({
      ...progress,
      [progressId]: {
        loaded: file.size,
        total: file.size,
        percentage: 100,
        file,
        key,
      },
    }));

    // Restore original middleware stack
    s3.middlewareStack = originalUpload;

    // Remove progress after a delay
    setTimeout(() => {
      uploadProgress.update((progress) => {
        const newProgress = { ...progress };
        delete newProgress[progressId];
        return newProgress;
      });
    }, 3000);

    return true;
  } catch (err) {
    console.error("Error uploading object:", err);
    error.set(`Error uploading object: ${err}`);
    return false;
  }
}

// Download an object
export async function downloadObject(
  key: string,
  filename?: string,
): Promise<boolean> {
  try {
    let client: S3Client | null = null;
    let config: S3Config | null = null;

    s3Client.subscribe((value) => (client = value))();
    s3Config.subscribe((value) => (config = value))();

    if (!client || !config) {
      throw new Error("S3 client not initialized");
    }

    // Type assertion to help TypeScript understand this is not null
    const s3 = client as S3Client;
    const s3Config = config as S3Config;

    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error("Empty response body");
    }

    // Convert the readable stream to a blob
    const blob = await new Response(response.Body as any).blob();

    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || key.split("/").pop() || "download";
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);

    return true;
  } catch (err) {
    console.error("Error downloading object:", err);
    error.set(`Error downloading object: ${err}`);
    return false;
  }
}

// Delete an object
export async function deleteObject(key: string): Promise<boolean> {
  try {
    let client: S3Client | null = null;
    let config: S3Config | null = null;

    s3Client.subscribe((value) => (client = value))();
    s3Config.subscribe((value) => (config = value))();

    if (!client || !config) {
      throw new Error("S3 client not initialized");
    }

    // Type assertion to help TypeScript understand this is not null
    const s3 = client as S3Client;
    const s3Config = config as S3Config;

    const command = new DeleteObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    });

    await s3.send(command);
    return true;
  } catch (err) {
    console.error("Error deleting object:", err);
    error.set(`Error deleting object: ${err}`);
    return false;
  }
}

// Create a folder (by creating an empty object with a trailing slash)
export async function createFolder(path: string): Promise<boolean> {
  try {
    let client: S3Client | null = null;
    let config: S3Config | null = null;

    s3Client.subscribe((value) => (client = value))();
    s3Config.subscribe((value) => (config = value))();

    if (!client || !config) {
      throw new Error("S3 client not initialized");
    }

    // Type assertion to help TypeScript understand this is not null
    const s3 = client as S3Client;
    const s3Config = config as S3Config;

    // Ensure the path ends with a slash
    const folderKey = path.endsWith("/") ? path : `${path}/`;

    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: folderKey,
      Body: "",
    });

    await s3.send(command);
    return true;
  } catch (err) {
    console.error("Error creating folder:", err);
    error.set(`Error creating folder: ${err}`);
    return false;
  }
}

// Rename/move an object
export async function moveObject(
  sourceKey: string,
  destinationKey: string,
): Promise<boolean> {
  try {
    let client: S3Client | null = null;
    let config: S3Config | null = null;

    s3Client.subscribe((value) => (client = value))();
    s3Config.subscribe((value) => (config = value))();

    if (!client || !config) {
      throw new Error("S3 client not initialized");
    }

    // Type assertion to help TypeScript understand this is not null
    const s3 = client as S3Client;
    const s3Config = config as S3Config;

    // Copy the object to the new location
    const copyCommand = new CopyObjectCommand({
      Bucket: s3Config.bucketName,
      CopySource: `${s3Config.bucketName}/${encodeURIComponent(sourceKey)}`,
      Key: destinationKey,
    });

    await s3.send(copyCommand);

    // Delete the original object
    const deleteCommand = new DeleteObjectCommand({
      Bucket: s3Config.bucketName,
      Key: sourceKey,
    });

    await s3.send(deleteCommand);
    return true;
  } catch (err) {
    console.error("Error moving/renaming object:", err);
    error.set(`Error moving/renaming object: ${err}`);
    return false;
  }
}

// Helper function to determine the content type of a file
export function getContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() || "";

  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    zip: "application/zip",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wav: "audio/wav",
    ogg: "audio/ogg",
    webm: "video/webm",
  };

  return contentTypes[extension] || "application/octet-stream";
}

// Get file icon based on file extension or mime type
export function getFileIcon(filename: string, mimeType?: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() || "";

  // Define icon mappings
  const iconMap: Record<string, string> = {
    // Images
    jpg: "image",
    jpeg: "image",
    png: "image",
    gif: "image",
    webp: "image",
    svg: "image",
    // Documents
    pdf: "file-pdf",
    doc: "file-word",
    docx: "file-word",
    xls: "file-excel",
    xlsx: "file-excel",
    ppt: "file-powerpoint",
    pptx: "file-powerpoint",
    txt: "file-text",
    // Code
    html: "code",
    htm: "code",
    css: "code",
    js: "code",
    json: "code",
    xml: "code",
    ts: "code",
    py: "code",
    java: "code",
    cpp: "code",
    c: "code",
    cs: "code",
    php: "code",
    rb: "code",
    go: "code",
    swift: "code",
    kt: "code",
    // Archives
    zip: "file-archive",
    rar: "file-archive",
    tar: "file-archive",
    gz: "file-archive",
    "7z": "file-archive",
    // Media
    mp3: "music",
    wav: "music",
    ogg: "music",
    mp4: "video",
    avi: "video",
    mov: "video",
    wmv: "video",
    webm: "video",
    // Folders
    folder: "folder",
  };

  // Check by mime type first if provided
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "music";
    if (mimeType.startsWith("text/")) return "file-text";
    if (mimeType.includes("pdf")) return "file-pdf";
    if (mimeType.includes("word")) return "file-word";
    if (mimeType.includes("excel")) return "file-excel";
    if (mimeType.includes("powerpoint")) return "file-powerpoint";
    if (mimeType.includes("zip") || mimeType.includes("compressed"))
      return "file-archive";
  }

  // Then check by file extension
  return iconMap[extension] || "file";
}
