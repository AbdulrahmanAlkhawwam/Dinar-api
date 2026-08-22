import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { OperationType } from '@prisma/client';

export class CreateOperationDto {
  @ApiProperty({ example: 'Salary' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'August salary' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1000, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Currency ID',
    example: 'cm2v8t3hl0000nmn0m0h1abcd',
  })
  @IsString()
  @IsNotEmpty()
  currencyId: string;

  @ApiProperty({ enum: OperationType, example: OperationType.INCOME })
  @IsEnum(OperationType)
  type: OperationType;

  @ApiPropertyOptional({
    example: '2026-08-22',
    description:
      'Operation date in ISO 8601 format. Defaults to the current date.',
  })
  @IsOptional()
  @IsDateString()
  operationDate?: string;
}
