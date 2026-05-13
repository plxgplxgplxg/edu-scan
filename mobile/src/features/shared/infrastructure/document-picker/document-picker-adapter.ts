import DocumentPicker, {
  type DocumentPickerResponse,
} from 'react-native-document-picker';

import type { NativeFile } from '../../domain/native-file';

function toNativeFile(file: DocumentPickerResponse): NativeFile {
  return {
    uri: file.fileCopyUri ?? file.uri,
    name: file.name ?? 'selected-file',
    type: file.type ?? 'application/octet-stream',
    size: file.size ?? null,
  };
}

export async function pickSingleDocument(
  type?: string | string[],
): Promise<NativeFile | null> {
  try {
    const file = await DocumentPicker.pickSingle({
      type,
      copyTo: 'cachesDirectory',
    });
    return toNativeFile(file);
  } catch (error) {
    if (DocumentPicker.isCancel(error)) {
      return null;
    }

    throw error;
  }
}

export async function pickMultipleDocuments(
  type?: string | string[],
): Promise<NativeFile[]> {
  try {
    const files = await DocumentPicker.pick({
      type,
      allowMultiSelection: true,
      copyTo: 'cachesDirectory',
    });
    return files.map(toNativeFile);
  } catch (error) {
    if (DocumentPicker.isCancel(error)) {
      return [];
    }

    throw error;
  }
}

export const documentTypes = DocumentPicker.types;
