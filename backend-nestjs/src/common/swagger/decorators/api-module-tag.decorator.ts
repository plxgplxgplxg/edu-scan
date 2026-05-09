import { ApiTags } from '@nestjs/swagger';
import type { SwaggerModuleMetadata } from '../swagger.metadata';

export function ApiModuleTag(moduleMetadata: SwaggerModuleMetadata) {
  return ApiTags(moduleMetadata.tagName);
}
