import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from '../../categories/entities/category.entity';

export class ProductEntity {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Smartphone X' }) title: string;
  @ApiProperty() description: string;
  @ApiProperty({ example: 499.99 }) price: number;
  @ApiProperty({ type: [String] }) images: string[];
  @ApiProperty({ example: 25 }) stock: number;
  @ApiProperty() categoryId: string;
  @ApiProperty({ type: () => CategoryEntity }) category: CategoryEntity;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
