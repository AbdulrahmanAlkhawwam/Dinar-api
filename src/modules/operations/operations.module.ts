import { Module } from '@nestjs/common';
import { CurrenciesModule } from '../currencies/currencies.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [CurrenciesModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
