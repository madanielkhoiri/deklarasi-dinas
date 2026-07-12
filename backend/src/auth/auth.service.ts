import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Pengguna } from '../pengguna/pengguna.entity';

// <--- fitur service auth login --->
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Pengguna)
    private readonly penggunaRepository: Repository<Pengguna>,

    private readonly jwtService: JwtService,
  ) {}

  private formatDataPengguna(pengguna: Pengguna) {
    return {
      id: pengguna.id,
      nrp: pengguna.nrp,
      nama: pengguna.nama,
      email: pengguna.email,
      nomor_telepon: pengguna.nomor_telepon,
      role: pengguna.role,
      aktif: pengguna.aktif,
      kode_tiket: pengguna.kode_tiket,
    };
  }

  async login(nrp: string, kata_sandi: string) {
    const pengguna = await this.penggunaRepository.findOne({
      where: {
        nrp,
      },
    });

    if (!pengguna) {
      throw new UnauthorizedException('NRP atau kata sandi salah');
    }

    if (!pengguna.aktif) {
      throw new UnauthorizedException('Akun tidak aktif. Hubungi Admin / FA.');
    }

    const kataSandiBenar = await bcrypt.compare(
      kata_sandi,
      pengguna.kata_sandi,
    );

    if (!kataSandiBenar) {
      throw new UnauthorizedException('NRP atau kata sandi salah');
    }

    const payload = {
      sub: pengguna.id,
      nrp: pengguna.nrp,
      nama: pengguna.nama,
      role: pengguna.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      pengguna: this.formatDataPengguna(pengguna),
    };
  }

  async ambilProfil(idPengguna: number) {
    const pengguna = await this.penggunaRepository.findOne({
      where: {
        id: idPengguna,
      },
    });

    if (!pengguna) {
      throw new NotFoundException('Profil pengguna tidak ditemukan');
    }

    if (!pengguna.aktif) {
      throw new UnauthorizedException('Akun tidak aktif. Hubungi Admin / FA.');
    }

    return this.formatDataPengguna(pengguna);
  }
}
// <--- end --->