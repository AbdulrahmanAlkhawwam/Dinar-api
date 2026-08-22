import { Role } from '@prisma/client';

export class UserEntity {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
