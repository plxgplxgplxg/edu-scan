import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { IStorageService, StoredFileMetadata } from './storage.interface';
import { Readable } from 'stream';
import { extname, parse } from 'node:path';

function sanitizePublicIdSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .toLowerCase();
}

@Injectable()
export class CloudinaryService implements IStorageService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('cloudinary.cloudName'),
      api_key: this.configService.get('cloudinary.apiKey'),
      api_secret: this.configService.get('cloudinary.apiSecret'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'eduscan',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) {
            this.logger.error(
              'Thử upload file lên Cloudinary thất bại',
              error instanceof Error ? error.stack : JSON.stringify(error),
            );
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return reject(
              error instanceof Error ? error : new Error(JSON.stringify(error)),
            );
          }
          if (!result)
            return reject(new Error('Khong nhan duoc ket qua tra ve'));
          resolve(result.secure_url);
        },
      );

      const toStream = Readable.from(file.buffer);
      toStream.pipe(upload);
    });
  }

  async uploadDocument(
    file: Express.Multer.File,
    folder = 'eduscan',
  ): Promise<StoredFileMetadata> {
    return new Promise((resolve, reject) => {
      const parsed = parse(file.originalname || 'file');
      const baseName = sanitizePublicIdSegment(parsed.name) || 'file';
      const extension = extname(file.originalname || '').toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `${baseName}-${uniqueSuffix}${extension}`,
          resource_type: 'auto',
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            const rejectionError =
              error instanceof Error ? error : new Error(JSON.stringify(error));
            this.logger.error(
              'Thử upload tài liệu lên Cloudinary thất bại',
              rejectionError.stack ?? rejectionError.message,
            );
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return reject(rejectionError);
          }
          if (!result) {
            return reject(new Error('Khong nhan duoc ket qua tra ve'));
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            uploadedAt: new Date(),
          });
        },
      );

      Readable.from(file.buffer).pipe(upload);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    } catch (e) {
      this.logger.error(`Lỗi khi xóa file ${publicId}`, e);
    }
  }
}
