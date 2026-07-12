import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { BuatPenggunaDto } from './dto/buat-pengguna.dto';
import { EditPenggunaDto } from './dto/edit-pengguna.dto';
import { Pengguna } from './pengguna.entity';

// <--- fitur service manajemen pengguna --->
@Injectable()
export class PenggunaService {
  constructor(
    @InjectRepository(Pengguna)
    private readonly penggunaRepository: Repository<Pengguna>,
  ) {}

  private bersihkanTeks(nilai?: string | null) {
    const teks = nilai?.trim();

    return teks ? teks : null;
  }

  private formatHasilPengguna(pengguna: Pengguna) {
    const { kata_sandi, ...hasil } = pengguna;

    return hasil;
  }

  private buatKodeTiket(nama: string, nrp: string) {
    const namaBersih = nama
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 3);

    const nrpAkhir = nrp.slice(-4);
    const angkaAcak = Math.floor(1000 + Math.random() * 9000);

    return `TKT-${namaBersih}${nrpAkhir}-${angkaAcak}`;
  }

  async buatPengguna(data: BuatPenggunaDto) {
    const nrp = data.nrp.trim();
    const nama = data.nama.trim();
    const email = this.bersihkanTeks(data.email);
    const nomorTelepon = this.bersihkanTeks(data.nomor_telepon);
    const kataSandi = data.kata_sandi.trim();
    const role = data.role || 'KARYAWAN';

    if (!nrp) {
      throw new BadRequestException('NRP wajib diisi');
    }

    if (!nama) {
      throw new BadRequestException('Nama wajib diisi');
    }

    if (!kataSandi) {
      throw new BadRequestException('Kata sandi wajib diisi');
    }

    const nrpSudahAda = await this.penggunaRepository.findOne({
      where: {
        nrp,
      },
    });

    if (nrpSudahAda) {
      throw new BadRequestException('NRP sudah terdaftar');
    }

    if (email) {
      const emailSudahAda = await this.penggunaRepository.findOne({
        where: {
          email,
        },
      });

      if (emailSudahAda) {
        throw new BadRequestException('Email sudah terdaftar');
      }
    }

    const kataSandiHash = await bcrypt.hash(kataSandi, 10);

    const pengguna = this.penggunaRepository.create({
      nrp,
      nama,
      email,
      nomor_telepon: nomorTelepon,
      kata_sandi: kataSandiHash,
      role,
      aktif: data.aktif ?? true,
      kode_tiket: this.buatKodeTiket(nama, nrp),
    });

    const penggunaTersimpan = await this.penggunaRepository.save(pengguna);

    return this.formatHasilPengguna(penggunaTersimpan);
  }

  async ambilSemuaPengguna() {
    const daftarPengguna = await this.penggunaRepository.find({
      order: {
        dibuat_pada: 'DESC',
      },
    });

    return daftarPengguna.map((pengguna) => this.formatHasilPengguna(pengguna));
  }

  async ambilPenggunaBerdasarkanId(id: number) {
    const pengguna = await this.penggunaRepository.findOne({
      where: {
        id,
      },
    });

    if (!pengguna) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return this.formatHasilPengguna(pengguna);
  }

  async ambilPenggunaBerdasarkanNrp(nrp: string) {
    return this.penggunaRepository.findOne({
      where: {
        nrp,
      },
    });
  }

  async editPengguna(id: number, data: EditPenggunaDto) {
    const pengguna = await this.penggunaRepository.findOne({
      where: {
        id,
      },
    });

    if (!pengguna) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    if (data.nrp !== undefined) {
      const nrpBaru = data.nrp.trim();

      if (!nrpBaru) {
        throw new BadRequestException('NRP tidak boleh kosong');
      }

      if (nrpBaru !== pengguna.nrp) {
        const nrpSudahAda = await this.penggunaRepository.findOne({
          where: {
            nrp: nrpBaru,
          },
        });

        if (nrpSudahAda) {
          throw new BadRequestException('NRP sudah digunakan pengguna lain');
        }

        pengguna.nrp = nrpBaru;
      }
    }

    if (data.email !== undefined) {
      const emailBaru = this.bersihkanTeks(data.email);

      if (emailBaru && emailBaru !== pengguna.email) {
        const emailSudahAda = await this.penggunaRepository.findOne({
          where: {
            email: emailBaru,
          },
        });

        if (emailSudahAda) {
          throw new BadRequestException('Email sudah digunakan pengguna lain');
        }
      }

      pengguna.email = emailBaru;
    }

    if (data.nama !== undefined) {
      const namaBaru = data.nama.trim();

      if (!namaBaru) {
        throw new BadRequestException('Nama tidak boleh kosong');
      }

      pengguna.nama = namaBaru;
    }

    if (data.nomor_telepon !== undefined) {
      pengguna.nomor_telepon = this.bersihkanTeks(data.nomor_telepon);
    }

    if (data.role !== undefined) {
      pengguna.role = data.role;
    }

    if (data.aktif !== undefined) {
      pengguna.aktif = data.aktif;
    }

    if (data.kata_sandi && data.kata_sandi.trim()) {
      pengguna.kata_sandi = await bcrypt.hash(data.kata_sandi.trim(), 10);
    }

    const penggunaTersimpan = await this.penggunaRepository.save(pengguna);

    return this.formatHasilPengguna(penggunaTersimpan);
  }

  async ubahStatusPengguna(id: number, aktif: boolean) {
    const pengguna = await this.penggunaRepository.findOne({
      where: {
        id,
      },
    });

    if (!pengguna) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    pengguna.aktif = aktif;

    const penggunaTersimpan = await this.penggunaRepository.save(pengguna);

    return this.formatHasilPengguna(penggunaTersimpan);
  }
}
// <--- end --->