import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.currency.findMany({ orderBy: { code: 'asc' } });
  }

  async findOne(id: string) {
    const currency = await this.prisma.currency.findUnique({ where: { id } });
    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} was not found`);
    }
    return currency;
  }

  async create(dto: CreateCurrencyDto) {
    try {
      return await this.prisma.currency.create({ data: dto });
    } catch (error) {
      this.rethrowKnownPrismaError(error, dto.code);
    }
  }

  async update(id: string, dto: UpdateCurrencyDto) {
    await this.findOne(id);
    try {
      return await this.prisma.currency.update({ where: { id }, data: dto });
    } catch (error) {
      this.rethrowKnownPrismaError(error, dto.code);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.currency.delete({ where: { id } });
  }

  /** Converts a USD amount using the supplied rate (1 USD = rate target units). */
  convertUsdToCurrency(amountUsd: number, exchangeRateFromUSD: number): number {
    this.assertValidConversionInputs(amountUsd, exchangeRateFromUSD);
    return amountUsd * exchangeRateFromUSD;
  }

  /** Converts a currency amount back to USD using its stored USD rate. */
  convertCurrencyToUsd(amount: number, exchangeRateFromUSD: number): number {
    this.assertValidConversionInputs(amount, exchangeRateFromUSD);
    return amount / exchangeRateFromUSD;
  }

  private assertValidConversionInputs(
    amount: number,
    exchangeRateFromUSD: number,
  ) {
    if (!Number.isFinite(amount)) {
      throw new TypeError('Amount must be a finite number');
    }
    if (!Number.isFinite(exchangeRateFromUSD) || exchangeRateFromUSD <= 0) {
      throw new TypeError('Exchange rate must be a positive finite number');
    }
  }

  private rethrowKnownPrismaError(error: unknown, code?: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(`Currency code ${code ?? ''} already exists`);
    }
    throw error;
  }
}
