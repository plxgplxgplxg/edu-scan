import { Alert, Linking, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

function getExtensionFromName(fileName?: string | null) {
  const match = fileName?.match(/\.([a-zA-Z0-9]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '';
}

function getExtensionFromUrl(url: string) {
  const cleanUrl = url.split('?')[0] ?? url;
  const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '';
}

function sanitizeFileName(fileName?: string | null, fallback = 'eduscan-file') {
  const normalized = (fileName || fallback)
    .replace(/[\\/:"*?<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || fallback;
}

export function normalizeCloudinaryDocumentUrl(url: string) {
  let nextUrl = url;

  if (nextUrl.includes('res.cloudinary.com') && nextUrl.includes('/image/upload/')) {
    nextUrl = nextUrl.replace('/image/upload/', '/raw/upload/');
  }

  const cleanUrl = nextUrl.split('?')[0] ?? nextUrl;
  const doubledExtension = cleanUrl.match(/(\.[a-zA-Z0-9]+)\1$/);
  if (doubledExtension) {
    const duplicate = doubledExtension[1];
    nextUrl = nextUrl.replace(`${duplicate}${duplicate}`, duplicate);
  }

  return nextUrl;
}

export async function downloadRemoteFile(input: {
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const normalizedUrl = normalizeCloudinaryDocumentUrl(input.url);
  const nameExtension = getExtensionFromName(input.fileName);
  const urlExtension = getExtensionFromUrl(normalizedUrl);
  const safeFileName = sanitizeFileName(
    input.fileName
      ? input.fileName.endsWith(nameExtension || urlExtension)
        ? input.fileName
        : `${input.fileName}${urlExtension}`
      : `eduscan-file${urlExtension || '.bin'}`,
  );

  if (Platform.OS !== 'android') {
    await Linking.openURL(normalizedUrl);
    return;
  }

  try {
    await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        mediaScannable: true,
        storeInDownloads: true,
        title: safeFileName,
        description: 'Tải tệp EduScan',
        mime: input.mimeType || 'application/octet-stream',
      },
    }).fetch('GET', normalizedUrl);
  } catch (error) {
    Alert.alert(
      'Không tải được tệp',
      error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
    );
  }
}
