import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseSettlementModule } from '../database-settlement/database-settlement.module';
import { Saldo } from '../saldo/saldo.entity';
import { DeklarasiController } from './deklarasi.controller';
import { Deklarasi } from './deklarasi.entity';
import { DeklarasiService } from './deklarasi.service';

// <--- fitur module deklarasi perjalanan dinas --->
@Module({
  imports: [
    DatabaseSettlementModule,
    TypeOrmModule.forFeature([
      Deklarasi,
      Saldo,
    ]),
  ],
  controllers: [DeklarasiController],
  providers: [DeklarasiService],
  exports: [DeklarasiService],
})
export class DeklarasiModule {}
// <--- end --->