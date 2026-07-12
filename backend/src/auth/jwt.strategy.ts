import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// <--- fitur strategy validasi jwt pengguna --->
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'rahasia_jwt_lokal',
    });
  }

  async validate(payload: {
    sub: number;
    nrp: string;
    nama?: string;
    role: 'SUPER_ADMIN' | 'FA' | 'KARYAWAN';
  }) {
    return {
      id: payload.sub,
      nrp: payload.nrp,
      nama: payload.nama,
      role: payload.role,
    };
  }
}
// <--- end --->