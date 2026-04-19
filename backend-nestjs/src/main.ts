import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/exception/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/response/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Edu Scan Backend API')
    .setDescription(
      [
        'OpenAPI specification for the Edu Scan NestJS backend.',
        'Success responses are wrapped as { message, statusCode, data } by the global response interceptor.',
        'Error responses are normalized as { statusCode, timestamp, path, message, error } by the global exception filter.',
      ].join('\n\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste access token issued by POST /auth/login.',
      },
      'bearer',
    )
    .addTag('auth', 'Authentication and token refresh flows')
    .addTag('users', 'Admin-only user management')
    .addTag('classes', 'Teacher-managed class roster operations')
    .addTag('exams', 'Teacher-managed exams, variants, and answer keys')
    .addTag('questions', 'Teacher question bank management')
    .addTag(
      'submissions',
      'Submission review, progress, and override operations',
    )
    .addTag('omr', 'OMR batch upload and result inspection')
    .addTag('remarks', 'Student remark requests and teacher review workflow')
    .addTag('reports', 'Teacher export endpoints for class reports')
    .addTag('assignments', 'Assignment creation, submission, and grading')
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
  });

  writeFileSync(
    join(process.cwd(), 'docs', 'openapi.json'),
    JSON.stringify(openApiDocument, null, 2),
    'utf8',
  );

  SwaggerModule.setup('api/docs', app, openApiDocument, {
    customSiteTitle: 'Edu Scan API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
