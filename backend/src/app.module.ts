import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseSettlementModule } from './database-settlement/database-settlement.module';
import { DeklarasiModule } from './deklarasi/deklarasi.module';
import { KaryawanModule } from './karyawan/karyawan.module';
import { NotaModule } from './nota/nota.module';
import { PengajuanModule } from './pengajuan/pengajuan.module';
import { PenggunaModule } from './pengguna/pengguna.module';
import { SaldoModule } from './saldo/saldo.module';

// <--- fitur konfigurasi aplikasi utama dan koneksi database --->
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: true,
    }),

    PenggunaModule,

    KaryawanModule,

    DeklarasiModule,

    
    DatabaseSettlementModule,
NotaModule,

    AuthModule,

    SaldoModule,

    PengajuanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
// <--- end --->