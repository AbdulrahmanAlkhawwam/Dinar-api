import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const password = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, password },
        select: userSelect,
      });
      const accessToken = await this.createAccessToken(user);
      return { user, accessToken };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const safeUser = this.toSafeUser(user);
    const accessToken = await this.createAccessToken(safeUser);
    const refreshToken = await this.createRefreshToken(safeUser);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 12) },
    });
    return { user: safeUser, accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (
      !user ||
      !user.refreshToken ||
      !(await bcrypt.compare(refreshToken, user.refreshToken))
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return { accessToken: await this.createAccessToken(this.toSafeUser(user)) };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  private async createAccessToken(
    user: Pick<
      Prisma.UserGetPayload<{ select: typeof userSelect }>,
      'id' | 'email' | 'role'
    >,
  ) {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private createRefreshToken(
    user: Pick<
      Prisma.UserGetPayload<{ select: typeof userSelect }>,
      'id' | 'email' | 'role'
    >,
  ) {
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow<string>(
          'jwt.refreshExpiresIn',
        ) as never,
      },
    );
  }

  private toSafeUser(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const {
      password: _password,
      refreshToken: _refreshToken,
      ...safeUser
    } = user as typeof user & {
      password?: string;
      refreshToken?: string | null;
    };
    return safeUser;
  }
}
