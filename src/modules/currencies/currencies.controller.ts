import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CurrencyEntity } from './entities/currency.entity';

@ApiTags('Currencies')
@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @ApiOperation({ summary: 'Get available currencies' })
  @ApiResponse({ status: 200, type: CurrencyEntity, isArray: true })
  findAll() {
    return this.currenciesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a currency (admin only)' })
  @ApiResponse({ status: 201, type: CurrencyEntity })
  @ApiResponse({ status: 409, description: 'Currency code already exists.' })
  create(@Body() dto: CreateCurrencyDto) {
    return this.currenciesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a currency or its exchange rate (admin only)',
  })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  @ApiResponse({ status: 200, type: CurrencyEntity })
  @ApiResponse({ status: 404, description: 'Currency not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    return this.currenciesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a currency (admin only)' })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  @ApiResponse({ status: 204, description: 'Currency deleted.' })
  @ApiResponse({ status: 404, description: 'Currency not found.' })
  remove(@Param('id') id: string) {
    return this.currenciesService.remove(id);
  }
}
