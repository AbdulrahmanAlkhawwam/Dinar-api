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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateOperationDto } from './dto/create-operation.dto';
import { QueryOperationsDto } from './dto/query-operations.dto';
import { UpdateOperationDto } from './dto/update-operation.dto';
import { OperationEntity } from './entities/operation.entity';
import { OperationsService } from './operations.service';

@ApiTags('Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a financial operation' })
  @ApiResponse({ status: 201, type: OperationEntity })
  @ApiResponse({ status: 404, description: 'Currency not found.' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOperationDto) {
    return this.operationsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user’s operations' })
  @ApiResponse({ status: 200, description: 'Paginated operations list.' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryOperationsDto) {
    return this.operationsService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an operation owned by the authenticated user' })
  @ApiParam({ name: 'id', description: 'Operation ID' })
  @ApiResponse({ status: 200, type: OperationEntity })
  @ApiResponse({ status: 404, description: 'Operation not found.' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.operationsService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an operation owned by the authenticated user',
  })
  @ApiParam({ name: 'id', description: 'Operation ID' })
  @ApiResponse({ status: 200, type: OperationEntity })
  @ApiResponse({ status: 404, description: 'Operation or currency not found.' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOperationDto,
  ) {
    return this.operationsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an operation owned by the authenticated user',
  })
  @ApiParam({ name: 'id', description: 'Operation ID' })
  @ApiResponse({ status: 204, description: 'Operation deleted.' })
  @ApiResponse({ status: 404, description: 'Operation not found.' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.operationsService.remove(user.sub, id);
  }
}
