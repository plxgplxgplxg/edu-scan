export abstract class IStorageService {
  abstract uploadFile(file: Express.Multer.File, folder?: string): Promise<string>;
  abstract deleteFile(publicId: string): Promise<void>;
}
