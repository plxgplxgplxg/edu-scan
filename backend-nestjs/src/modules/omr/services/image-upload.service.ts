import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IStorageService } from '../../../storage/storage.interface';

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class ImageUploadService {
  constructor(
    @Inject(IStorageService)
    private readonly storageService: IStorageService,
  ) {}

  validateFiles(files: Express.Multer.File[]) {
    if (!files.length) {
      throw new BadRequestException('At least one image file is required');
    }

    for (const file of files) {
      if (!SUPPORTED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.originalname}`,
        );
      }
    }
  }

  async uploadFile(file: Express.Multer.File, batchId: string) {
    return this.storageService.uploadFile(file, `eduscan/omr/${batchId}`);
  }
}
