import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Deklarasi } from '../deklarasi/deklarasi.entity';
import { Nota } from '../nota/nota.entity';
import { Pengajuan } from '../pengajuan/pengajuan.entity';
import { DatabaseSettlementController } from './database-settlement.controller';
import { DatabaseSettlement } from './database-settlement.entity';
import { DatabaseSettlementService } from './database-settlement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DatabaseSettlement,
      Nota,
      Deklarasi,
      Pengajuan,
    ]),
  ],
  controllers: [DatabaseSettlementController],
  providers: [DatabaseSettlementService],
  exports: [DatabaseSettlementService],
})
export class DatabaseSettlementModule {}
