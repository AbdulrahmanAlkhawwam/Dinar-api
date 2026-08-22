import { OperationType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyEntity } from '../../currencies/entities/currency.entity';

export class OperationEntity {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: OperationType }) type: OperationType;
  @ApiProperty({ example: 'Salary' }) title: string;
  @ApiPropertyOptional({ example: 'August salary', nullable: true })
  description: string | null;
  @ApiProperty({ example: 1000 }) amount: number;
  @ApiProperty() currencyId: string;
  @ApiProperty({
    example: 14000,
    description: 'Rate snapshot used for this operation',
  })
  exchangeRate: number;
  @ApiProperty({ example: 0.0714285714 }) amountInUSD: number;
  @ApiProperty({ example: '2026-08-22T00:00:00.000Z' }) operationDate: Date;
  @ApiProperty({ type: () => CurrencyEntity }) currency: CurrencyEntity;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
