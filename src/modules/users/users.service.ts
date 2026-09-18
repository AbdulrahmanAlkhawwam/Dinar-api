import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const PASSWORD_HASH_ROUNDS = 12;

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const password = await bcrypt.hash(
      createUserDto.password,
      PASSWORD_HASH_ROUNDS,
    );
    try {
      return await this.prisma.user.create({
        data: { ...createUserDto, password },
        select: userSelect,
      });
    } catch (error) {
      throw this.toConflictIfDuplicateEmail(error);
    }
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} was not found`);
    }

    return user;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: userSelect,
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id);

    const data: Prisma.UserUpdateInput = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(
        updateUserDto.password,
        PASSWORD_HASH_ROUNDS,
      );
      // A new password ends every existing session for this user.
      data.refreshToken = null;
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: userSelect,
      });
    } catch (error) {
      throw this.toConflictIfDuplicateEmail(error);
    }
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.user.delete({
      where: { id },
      select: userSelect,
    });
  }

  private toConflictIfDuplicateEmail(error: unknown) {
    if (isUniqueConstraintError(error)) {
      return new ConflictException('An account with this email already exists');
    }
    return error;
  }
}
