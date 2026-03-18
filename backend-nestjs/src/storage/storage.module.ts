import { Global, Module } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import { CloudinaryService } from './cloudinary.service';

@Global()
@Module({
  providers: [
    {
      provide: IStorageService,
      useClass: CloudinaryService, // Map interface sang Cloudinary
    },
  ],
  exports: [IStorageService],
})
export class StorageModule {}
