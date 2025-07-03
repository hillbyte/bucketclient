import { getFileIcon } from '../services/s3.service';

// Format file size in human-readable format
export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return '0 B';
  if (bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}

// Format date in human-readable format
export function formatDate(date: Date | undefined): string {
  if (!date) return 'Unknown';

  return new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// Check if a file is an image
export function isImage(filename: string, contentType?: string): boolean {
  const extension = getFileExtension(filename);
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'];

  if (contentType && contentType.startsWith('image/')) return true;
  return imageExtensions.includes(extension);
}

// Check if a file is a video
export function isVideo(filename: string, contentType?: string): boolean {
  const extension = getFileExtension(filename);
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv'];

  if (contentType && contentType.startsWith('video/')) return true;
  return videoExtensions.includes(extension);
}

// Check if a file is audio
export function isAudio(filename: string, contentType?: string): boolean {
  const extension = getFileExtension(filename);
  const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];

  if (contentType && contentType.startsWith('audio/')) return true;
  return audioExtensions.includes(extension);
}

// Check if a file is a PDF
export function isPdf(filename: string, contentType?: string): boolean {
  const extension = getFileExtension(filename);

  if (contentType && contentType === 'application/pdf') return true;
  return extension === 'pdf';
}

// Check if a file is plain text
export function isText(filename: string, contentType?: string): boolean {
  const extension = getFileExtension(filename);
  const textExtensions = ['txt', 'md', 'html', 'htm', 'css', 'js', 'json', 'xml', 'csv', 'ts', 'jsx', 'tsx'];

  if (contentType && contentType.startsWith('text/')) return true;
  return textExtensions.includes(extension);
}

// Get file type category
export function getFileTypeCategory(filename: string, contentType?: string): string {
  if (isImage(filename, contentType)) return 'image';
  if (isVideo(filename, contentType)) return 'video';
  if (isAudio(filename, contentType)) return 'audio';
  if (isPdf(filename, contentType)) return 'pdf';
  if (isText(filename, contentType)) return 'text';

  const extension = getFileExtension(filename);

  // Documents
  const docExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
  if (docExtensions.includes(extension)) return 'document';

  // Archives
  const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
  if (archiveExtensions.includes(extension)) return 'archive';

  return 'other';
}

// Get icon for file
export function getFileTypeIcon(filename: string, contentType?: string): string {
  return getFileIcon(filename, contentType);
}

// Create breadcrumb segments from path
export function createBreadcrumbs(path: string): Array<{name: string, path: string}> {
  const segments = path.split('/').filter(Boolean);

  // Start with root
  const breadcrumbs = [{ name: 'Home', path: '' }];

  // Build path progressively
  let currentPath = '';
  segments.forEach(segment => {
    currentPath += `${segment}/`;
    breadcrumbs.push({
      name: segment,
      path: currentPath
    });
  });

  return breadcrumbs;
}

// Generate a random-ish ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Check if a file should be previewed inline
export function canPreviewInline(filename: string, contentType?: string): boolean {
  return isImage(filename, contentType) ||
         isPdf(filename, contentType) ||
         isText(filename, contentType) ||
         isVideo(filename, contentType);
}

// Calculate time left for upload
export function calculateTimeLeft(loaded: number, total: number, startTime: number): string {
  if (loaded === 0) return 'Calculating...';

  const elapsed = (Date.now() - startTime) / 1000; // in seconds
  const rate = loaded / elapsed; // bytes per second
  const remaining = (total - loaded) / rate; // seconds left

  if (remaining < 60) return `${Math.round(remaining)} seconds left`;
  if (remaining < 3600) return `${Math.round(remaining / 60)} minutes left`;
  return `${Math.round(remaining / 3600)} hours left`;
}
