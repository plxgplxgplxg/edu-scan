import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto';
import { ApiSuccessResponseDto } from '../dto/api-success-response.dto';

export type ApiErrorStatus =
  | HttpStatus.BAD_REQUEST
  | HttpStatus.UNAUTHORIZED
  | HttpStatus.FORBIDDEN
  | HttpStatus.NOT_FOUND
  | HttpStatus.CONFLICT
  | HttpStatus.INTERNAL_SERVER_ERROR;

type WrappedResponseOptions = {
  description: string;
  isArray?: boolean;
  type?: Type<unknown>;
};

function buildEnvelopeSchema(type?: Type<unknown>, isArray = false) {
  const dataSchema = type
    ? isArray
      ? { type: 'array', items: { $ref: getSchemaPath(type) } }
      : { $ref: getSchemaPath(type) }
    : { nullable: true, example: null };

  return {
    allOf: [
      { $ref: getSchemaPath(ApiSuccessResponseDto) },
      {
        properties: {
          data: dataSchema,
        },
      },
    ],
  };
}

export function ApiWrappedOkResponse(options: WrappedResponseOptions) {
  const models = options.type
    ? [ApiSuccessResponseDto, options.type]
    : [ApiSuccessResponseDto];

  return applyDecorators(
    ApiExtraModels(...models),
    ApiOkResponse({
      description: options.description,
      schema: buildEnvelopeSchema(options.type, options.isArray),
    }),
  );
}

export function ApiWrappedCreatedResponse(options: WrappedResponseOptions) {
  const models = options.type
    ? [ApiSuccessResponseDto, options.type]
    : [ApiSuccessResponseDto];

  return applyDecorators(
    ApiExtraModels(...models),
    ApiCreatedResponse({
      description: options.description,
      schema: buildEnvelopeSchema(options.type, options.isArray),
    }),
  );
}

export function ApiWrappedNoContentResponse(description: string) {
  return applyDecorators(ApiNoContentResponse({ description }));
}

export function ApiStandardErrorResponses(
  ...statuses: ApiErrorStatus[]
): MethodDecorator & ClassDecorator {
  const decorators = [ApiExtraModels(ApiErrorResponseDto)];

  for (const status of statuses) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        decorators.push(
          ApiBadRequestResponse({
            description:
              'Dữ liệu gửi lên không hợp lệ, thiếu trường bắt buộc hoặc không vượt qua validation.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.UNAUTHORIZED:
        decorators.push(
          ApiUnauthorizedResponse({
            description:
              'Thiếu token xác thực, token không hợp lệ hoặc token đã hết hạn.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.FORBIDDEN:
        decorators.push(
          ApiForbiddenResponse({
            description:
              'Người dùng đã xác thực nhưng không có đủ quyền để truy cập endpoint này.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.NOT_FOUND:
        decorators.push(
          ApiNotFoundResponse({
            description:
              'Không tìm thấy tài nguyên tương ứng với tham số truyền vào.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.CONFLICT:
        decorators.push(
          ApiConflictResponse({
            description:
              'Phát sinh xung đột dữ liệu hoặc tài nguyên đã tồn tại theo ràng buộc nghiệp vụ.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        decorators.push(
          ApiInternalServerErrorResponse({
            description:
              'Lỗi hệ thống ngoài dự kiến trong quá trình xử lý yêu cầu.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      default:
        decorators.push(
          ApiResponse({
            status,
            description: 'Lỗi API',
            type: ApiErrorResponseDto,
          }),
        );
    }
  }

  return applyDecorators(...decorators);
}
