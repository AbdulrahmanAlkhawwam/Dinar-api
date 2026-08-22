import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Smartphone X' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A powerful smartphone with an all-day battery.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 499.99, minimum: 0.01 })
  @Type(() => Number)
  @IsPositive()
  price: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/images/phone.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiProperty({ example: 25, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ description: 'ID of the category containing this product' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
