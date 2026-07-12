import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaldoController } from './saldo.controller';
import { SaldoService } from './saldo.service';
import { Saldo } from './saldo.entity';
import { Pengguna } from '../pengguna/pengguna.entity';
import { Deklarasi } from '../deklarasi/deklarasi.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Saldo, Pengguna, Deklarasi])],
  controllers: [SaldoController],
  providers: [SaldoService],
  exports: [SaldoService],
})
export class SaldoModule {}