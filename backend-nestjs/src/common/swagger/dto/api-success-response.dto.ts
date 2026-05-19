import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessResponseDto {
  @ApiProperty({ example: 'Thành công' })
  message!: string;

  @ApiProperty({ example: 200 })
  statusCode!: number;
}
