import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserEntity {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Jane Doe' }) name: string;
  @ApiProperty({ example: 'jane@example.com' }) email: string;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ type: String, nullable: true }) avatar: string | null;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
