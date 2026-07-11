import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { IStorageService } from './storage.interface';
import { Readable } from 'stream';

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

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      this.logger.error(`Lỗi khi xóa file ${publicId}`, e);
    }
  }
}
