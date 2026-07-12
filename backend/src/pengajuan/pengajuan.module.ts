import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pengguna } from '../pengguna/pengguna.entity';
import { SaldoModule } from '../saldo/saldo.module';
import { PengajuanController } from './pengajuan.controller';
import { Pengajuan } from './pengajuan.entity';
import { PengajuanService } from './pengajuan.service';

// <--- fitur module pengajuan STD, RAB, dan bukti transfer --->
@Module({
  imports: [TypeOrmModule.forFeature([Pengajuan, Pengguna]), SaldoModule],
  controllers: [PengajuanController],
  providers: [PengajuanService],
  exports: [PengajuanService],
})
export class PengajuanModule {}
// <--- end --->