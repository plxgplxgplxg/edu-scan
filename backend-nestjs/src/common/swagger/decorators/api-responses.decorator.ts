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
            description: 'Yeu cau khong hop le hoặc validation failed.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.UNAUTHORIZED:
        decorators.push(
          ApiUnauthorizedResponse({
            description: 'Thieu token hoặc token khong hop le.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.FORBIDDEN:
        decorators.push(
          ApiForbiddenResponse({
            description: 'Nguoi dung khong du quyen truy cap endpoint.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.NOT_FOUND:
        decorators.push(
          ApiNotFoundResponse({
            description: 'Khong tim thay tai nguyen.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.CONFLICT:
        decorators.push(
          ApiConflictResponse({
            description: 'Xung dot du lieu hoặc tai nguyen da ton tai.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        decorators.push(
          ApiInternalServerErrorResponse({
            description: 'Loi he thong khong mong doi.',
            type: ApiErrorResponseDto,
          }),
        );
        break;
      default:
        decorators.push(
          ApiResponse({
            status,
            description: 'Loi API',
            type: ApiErrorResponseDto,
          }),
        );
    }
  }

  return applyDecorators(...decorators);
}
