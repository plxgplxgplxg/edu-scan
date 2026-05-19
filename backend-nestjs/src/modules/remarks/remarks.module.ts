import { Module } from '@nestjs/common';
import { RemarksController } from './controllers/remarks.controller';
import { RemarksService } from './services/remarks.service';
import { RemarksRepository } from './repositories/remarks.repository';

@Module({
  controllers: [RemarksController],
  providers: [RemarksService, RemarksRepository],
  exports: [RemarksService],
})
export class RemarksModule {}
