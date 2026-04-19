import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export function buildAccessDescription(roles: Role[], notes?: string): string {
  const lines = [`Vai trò được phép truy cập: ${roles.join(', ')}.`];

  if (notes) {
    lines.push(notes);
  }

  return lines.join('\n\n');
}

export function ApiBearerOperation(options: {
  summary: string;
  roles: Role[];
  notes?: string;
}) {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiOperation({
      summary: options.summary,
      description: buildAccessDescription(options.roles, options.notes),
    }),
  );
}

export function ApiPublicOperation(options: {
  summary: string;
  notes?: string;
}) {
  return ApiOperation({
    summary: options.summary,
    description:
      options.notes ?? 'Endpoint công khai, không yêu cầu Bearer access token.',
  });
}
