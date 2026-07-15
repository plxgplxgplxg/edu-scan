export type StoredFileMetadata = {
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
};

export abstract class IStorageService {
  abstract uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<string>;
  abstract uploadDocument(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<StoredFileMetadata>;
  abstract deleteFile(publicId: string): Promise<void>;
}
