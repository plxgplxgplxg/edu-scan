import { Module } from '@nestjs/common';
import { ClassesController } from './controllers/classes.controller';
import { ClassesRepository } from './repositories/classes.repository';
import { ClassesService } from './services/classes.service';

@Module({
  controllers: [ClassesController],
  providers: [ClassesRepository, ClassesService],
  exports: [ClassesRepository, ClassesService],
})
export class ClassesModule {}
