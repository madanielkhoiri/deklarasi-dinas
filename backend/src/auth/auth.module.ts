import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pengguna } from '../pengguna/pengguna.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

// <--- fitur module auth login dan jwt --->
@Module({
  imports: [
    TypeOrmModule.forFeature([Pengguna]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'rahasia_deklarasi_dinas',
      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
// <--- end --->