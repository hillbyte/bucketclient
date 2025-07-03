import { writable, derived } from "svelte/store";
import type { S3Item } from "./services/s3.service";

// UI state
export const sidebarOpen = writable<boolean>(true);
export const isLoading = writable<boolean>(false);
export const activeView = writable<"grid" | "list">("grid");
export const searchQuery = writable<string>("");
export const sortBy = writable<"name" | "date" | "size" | "type">("name");
export const sortOrder = writable<"asc" | "desc">("asc");
export const selectedItems = writable<Set<string>>(new Set());
export const previewItem = writable<S3Item | null>(null);
export const showUploadModal = writable<boolean>(false);
export const showNewFolderModal = writable<boolean>(false);
export const showShareModal = writable<boolean>(false);
export const showSettingsModal = writable<boolean>(false);
export const showDeleteConfirmModal = writable<boolean>(false);
export const showRenameModal = writable<boolean>(false);
export const mobileMenuOpen = writable<boolean>(false);
export const uploadProgressVisible = writable<boolean>(false);
export const fileTypeFilter = writable<string | null>(null);
export const theme = writable<"light" | "dark" | "system">("system");
export const error = writable<string | null>(null);
export const toast = writable<{
  message: string;
  type: "success" | "error" | "info" | "warning";
} | null>(null);

// File browser state
export const currentPath = writable<string>("");
export const s3Items = writable<S3Item[]>([]);
export const uploadQueue = writable<File[]>([]);

// Derived stores
export const filteredItems = derived(
  [s3Items, searchQuery, sortBy, sortOrder, fileTypeFilter],
  ([$s3Items, $searchQuery, $sortBy, $sortOrder, $fileTypeFilter]) => {
    // First filter by search query and file type
    let filtered = [...$s3Items];

    // Apply search filter
    if ($searchQuery) {
      const searchLower = $searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchLower),
      );
    }

    // Apply file type filter
    if ($fileTypeFilter) {
      filtered = filtered.filter((item) => {
        if (item.type === "folder") return true;
        const extension = item.name.split(".").pop()?.toLowerCase() || "";

        switch ($fileTypeFilter) {
          case "image":
            return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
              extension,
            );
          case "document":
            return [
              "pdf",
              "doc",
              "docx",
              "xls",
              "xlsx",
              "ppt",
              "pptx",
              "txt",
            ].includes(extension);
          case "video":
            return ["mp4", "avi", "mov", "wmv", "webm", "mkv"].includes(
              extension,
            );
          case "audio":
            return ["mp3", "wav", "ogg", "flac"].includes(extension);
          case "archive":
            return ["zip", "rar", "7z", "tar", "gz"].includes(extension);
          case "code":
            return [
              "js",
              "ts",
              "html",
              "css",
              "py",
              "java",
              "c",
              "cpp",
              "go",
              "php",
              "rb",
            ].includes(extension);
          default:
            return true;
        }
      });
    }

    // Then sort items
    filtered.sort((a, b) => {
      // Always put folders first
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }

      // Then sort by the selected criteria
      let comparison = 0;
      switch ($sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "date":
          comparison =
            (a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0);
          break;
        case "size":
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case "type":
          const aExt = a.name.split(".").pop() || "";
          const bExt = b.name.split(".").pop() || "";
          comparison = aExt.localeCompare(bExt);
          break;
      }

      // Apply sort direction
      return $sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  },
);

// Toast helpers
export function showToast(
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
) {
  toast.set({ message, type });
  setTimeout(() => toast.set(null), 3000);
}

// Theme helpers
export function initTheme() {
  const savedTheme = localStorage.getItem("theme") as
    | "light"
    | "dark"
    | "system"
    | null;
  if (savedTheme) {
    theme.set(savedTheme);
  }

  // Apply theme
  applyTheme();
}

export function applyTheme() {
  theme.subscribe((value) => {
    let effectiveTheme = value;

    if (value === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    document.documentElement.setAttribute("data-theme", effectiveTheme);
    localStorage.setItem("theme", value);
  })();
}

// Selection helpers
export function toggleSelection(key: string) {
  selectedItems.update((items) => {
    const newItems = new Set(items);
    if (newItems.has(key)) {
      newItems.delete(key);
    } else {
      newItems.add(key);
    }
    return newItems;
  });
}

export function clearSelection() {
  selectedItems.set(new Set());
}

export function selectAll() {
  s3Items.subscribe((items) => {
    const keys = items.map((item) => item.key);
    selectedItems.set(new Set(keys));
  })();
}

// File type filtering helpers
export function setFileTypeFilter(type: string | null) {
  fileTypeFilter.set(type);
}

export function clearFileTypeFilter() {
  fileTypeFilter.set(null);
}

// Upload progress helpers
export function showUploadProgress() {
  uploadProgressVisible.set(true);
}

export function hideUploadProgress() {
  uploadProgressVisible.set(false);
}

// Get file extension icon helper
export function getFileTypeIcon(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() || "";

  // Image files
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) {
    return "image";
  }

  // Document files
  if (["pdf"].includes(extension)) {
    return "file-pdf";
  }
  if (["doc", "docx"].includes(extension)) {
    return "file-word";
  }
  if (["xls", "xlsx"].includes(extension)) {
    return "file-excel";
  }
  if (["ppt", "pptx"].includes(extension)) {
    return "file-powerpoint";
  }
  if (["txt", "rtf"].includes(extension)) {
    return "file-text";
  }

  // Media files
  if (["mp4", "avi", "mov", "wmv", "webm", "mkv"].includes(extension)) {
    return "video";
  }
  if (["mp3", "wav", "ogg", "flac"].includes(extension)) {
    return "music";
  }

  // Archive files
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return "file-archive";
  }

  // Code files
  if (
    [
      "js",
      "ts",
      "html",
      "css",
      "py",
      "java",
      "c",
      "cpp",
      "go",
      "php",
      "rb",
    ].includes(extension)
  ) {
    return "code";
  }

  // Default icon
  return "file";
}
