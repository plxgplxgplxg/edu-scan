import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: '2026-04-19T10:15:30.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/users/123' })
  path!: string;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Dữ liệu gửi lên không hợp lệ' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['email phải đúng định dạng địa chỉ thư điện tử'],
      },
    ],
  })
  message!: string | string[];

  @ApiProperty({ example: 'Yêu cầu không hợp lệ' })
  error!: string;
}
