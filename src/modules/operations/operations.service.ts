import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrenciesService } from '../currencies/currencies.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateOperationDto } from './dto/create-operation.dto';
import { QueryOperationsDto } from './dto/query-operations.dto';
import { UpdateOperationDto } from './dto/update-operation.dto';

const operationInclude = { currency: true } satisfies Prisma.OperationInclude;

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currenciesService: CurrenciesService,
  ) {}

  async create(userId: string, dto: CreateOperationDto) {
    const currency = await this.currenciesService.findOne(dto.currencyId);
    const operationDate = dto.operationDate
      ? new Date(dto.operationDate)
      : new Date();

    return this.prisma.operation.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        currencyId: currency.id,
        type: dto.type,
        operationDate,
        exchangeRate: currency.exchangeRateFromUSD,
        amountInUSD: this.currenciesService.convertCurrencyToUsd(
          dto.amount,
          currency.exchangeRateFromUSD,
        ),
      },
      include: operationInclude,
    });
  }

  async findAll(userId: string, query: QueryOperationsDto) {
    const { page, limit, type, from, to } = query;
    const where: Prisma.OperationWhereInput = {
      userId,
      ...(type && { type }),
      ...((from || to) && {
        operationDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: this.endOfDay(to) }),
        },
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.operation.findMany({
        where,
        include: operationInclude,
        orderBy: [{ operationDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.operation.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(userId: string, id: string) {
    const operation = await this.prisma.operation.findFirst({
      where: { id, userId },
      include: operationInclude,
    });
    if (!operation) {
      throw new NotFoundException(`Operation with ID ${id} was not found`);
    }
    return operation;
  }

  async update(userId: string, id: string, dto: UpdateOperationDto) {
    const operation = await this.findOne(userId, id);
    const currencyChanged = dto.currencyId !== undefined;
    const currency = currencyChanged
      ? await this.currenciesService.findOne(dto.currencyId!)
      : operation.currency;
    const amount = dto.amount ?? operation.amount;
    const exchangeRate = currencyChanged
      ? currency.exchangeRateFromUSD
      : operation.exchangeRate;

    return this.prisma.operation.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        operationDate: dto.operationDate
          ? new Date(dto.operationDate)
          : undefined,
        ...(currencyChanged || dto.amount !== undefined
          ? {
              amount,
              ...(currencyChanged && { currencyId: currency.id }),
              exchangeRate,
              amountInUSD: this.currenciesService.convertCurrencyToUsd(
                amount,
                exchangeRate,
              ),
            }
          : {}),
      },
      include: operationInclude,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.operation.delete({ where: { id } });
  }

  private endOfDay(date: string): Date {
    const result = new Date(date);
    result.setUTCHours(23, 59, 59, 999);
    return result;
  }
}
