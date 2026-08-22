import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryEntity {
  @ApiProperty({ example: 'cm2v8t3hl0000nmn0m0h1abcd' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiPropertyOptional({
    example: 'https://example.com/images/electronics.jpg',
    nullable: true,
  })
  image: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
