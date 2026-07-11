import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './services/statistics.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
