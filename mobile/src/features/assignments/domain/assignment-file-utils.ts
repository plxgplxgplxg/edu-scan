export function getFileExtension(name: string) {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : '';
}

export function formatFileSize(sizeBytes: number | null | undefined) {
  if (!sizeBytes) {
    return 'Không rõ dung lượng';
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${String(Math.max(1, Math.round(sizeBytes / 1024)))} KB`;
}
