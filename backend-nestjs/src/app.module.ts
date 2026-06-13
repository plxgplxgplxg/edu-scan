import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import cloudinaryConfig from './config/cloudinary.config';
import redisConfig from './config/redis.config';
import omrConfig from './config/omr.config';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ExamsModule } from './modules/exams/exams.module';
import { OmrModule } from './modules/omr/omr.module';
import { UsersModule } from './modules/users/users.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { RemarksModule } from './modules/remarks/remarks.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, cloudinaryConfig, redisConfig, omrConfig],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
        },
      }),
    }),
    DatabaseModule,
    StorageModule,
    AuthModule,
    ClassesModule,
    ExamsModule,
    OmrModule,
    UsersModule,
    SubmissionsModule,
    AssignmentsModule,
    QuestionsModule,
    ReportsModule,
    EventEmitterModule.forRoot(),
    RemarksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
