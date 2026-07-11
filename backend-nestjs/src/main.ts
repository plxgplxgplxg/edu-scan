import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/exception/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/response/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging/logging.interceptor';
import { setupSwagger } from './common/swagger/swagger.factory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
