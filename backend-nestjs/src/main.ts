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
    .setTitle('Tài liệu API Edu Scan Backend')
    .setDescription(
      [
        'Tài liệu OpenAPI cho backend NestJS của hệ thống Edu Scan.',
        'Mọi response thành công được chuẩn hóa theo dạng `{ message, statusCode, data }` bởi global response interceptor.',
        'Mọi response lỗi được chuẩn hóa theo dạng `{ statusCode, timestamp, path, message, error }` bởi global exception filter.',
        'Các endpoint có biểu tượng ổ khóa yêu cầu JWT Bearer access token lấy từ endpoint `POST /auth/login`.',
      ].join('\n\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Dán access token JWT được cấp từ endpoint POST /auth/login để thử các endpoint cần xác thực.',
      },
      'bearer',
    )
    .addTag('auth', 'Xác thực đăng nhập và làm mới token')
    .addTag('users', 'Quản trị người dùng dành cho ADMIN')
    .addTag('classes', 'Quản lý lớp học, danh sách học sinh và mã tham gia lớp')
    .addTag('exams', 'Quản lý đề thi, mã đề, đáp án và sơ đồ câu hỏi')
    .addTag('questions', 'Ngân hàng câu hỏi của giáo viên')
    .addTag(
      'submissions',
      'Tra cứu bài làm, tiến độ làm bài và override thủ công',
    )
    .addTag('omr', 'Tải lên batch OMR, chấm bài và xem kết quả xử lý')
    .addTag('remarks', 'Yêu cầu phúc khảo của học sinh và quy trình duyệt')
    .addTag('reports', 'Xuất báo cáo lớp học cho giáo viên')
    .addTag('assignments', 'Quản lý bài tập, nộp bài và chấm điểm')
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
    customSiteTitle: 'Swagger UI - Edu Scan Backend',
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
