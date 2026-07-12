import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotaController } from './nota.controller';
import { NotaService } from './nota.service';
import { Nota } from './nota.entity';
import { Deklarasi } from '../deklarasi/deklarasi.entity';
import { SaldoModule } from '../saldo/saldo.module';
import { OcrSpaceService } from './ocr-space.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Nota, Deklarasi]),
    SaldoModule,
  ],
  controllers: [NotaController],
  providers: [NotaService, OcrSpaceService],
  exports: [NotaService],
})
export class NotaModule {}