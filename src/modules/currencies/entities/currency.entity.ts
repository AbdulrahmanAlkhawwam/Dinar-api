import { ApiProperty } from '@nestjs/swagger';

export class CurrencyEntity {
  @ApiProperty({ example: 'cm2v8t3hl0000nmn0m0h1abcd' })
  id: string;

  @ApiProperty({ example: 'USD' })
  code: string;

  @ApiProperty({ example: 'US Dollar' })
  name: string;

  @ApiProperty({ example: '$' })
  symbol: string;

  @ApiProperty({ example: 1 })
  exchangeRateFromUSD: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
