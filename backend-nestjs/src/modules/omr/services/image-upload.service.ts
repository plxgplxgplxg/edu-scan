import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { IStorageService } from '../../../storage/storage.interface';

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);

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

  async uploadArtifact(
    artifactRef: string | null | undefined,
    batchId: string,
  ): Promise<string | null> {
    if (!artifactRef) {
      return null;
    }

    if (/^https?:\/\//i.test(artifactRef)) {
      return artifactRef;
    }

    try {
      const buffer = await readFile(artifactRef);
      const fileName = basename(artifactRef);
      return await this.storageService.uploadFile(
        {
          fieldname: 'artifact',
          originalname: fileName,
          encoding: '7bit',
          mimetype: this.resolveMimeType(fileName),
          size: buffer.byteLength,
          buffer,
          stream: undefined as never,
          destination: '',
          filename: fileName,
          path: artifactRef,
        },
        `eduscan/omr/${batchId}/artifacts`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to upload OMR artifact from ${artifactRef}: ${message}`,
      );
      return null;
    }
  }

  private resolveMimeType(fileName: string) {
    const extension = extname(fileName).toLowerCase();
    if (extension === '.png') {
      return 'image/png';
    }
    if (extension === '.jpg' || extension === '.jpeg') {
      return 'image/jpeg';
    }
    if (extension === '.webp') {
      return 'image/webp';
    }
    return 'application/json';
  }
}
