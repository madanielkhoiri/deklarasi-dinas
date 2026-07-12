import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PenggunaController } from './pengguna.controller';
import { Pengguna } from './pengguna.entity';
import { PenggunaService } from './pengguna.service';

// <--- fitur module pengguna --->
@Module({
  imports: [TypeOrmModule.forFeature([Pengguna])],
  controllers: [PenggunaController],
  providers: [PenggunaService],
  exports: [PenggunaService],
})
export class PenggunaModule {}
// <--- end --->