import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Repository } from 'typeorm';

import { buatKodeDeklarasi } from '../bantuan/kode-deklarasi.bantuan';
import { Deklarasi } from '../deklarasi/deklarasi.entity';
import { BuatSaldoDto } from './buat-saldo.dto';
import { Saldo } from './saldo.entity';

declare const require: any;
const sharpModule = require('sharp');
const sharp = sharpModule.default || sharpModule;

type StatusBuktiPengembalian = 'DISETUJUI' | 'DITOLAK';

// <--- fitur service saldo karyawan + auto deklarasi aktif + bukti pengembalian --->
@Injectable()
export class SaldoService {
  constructor(
    @InjectRepository(Saldo)
    private readonly saldoRepository: Repository<Saldo>,

    @InjectRepository(Deklarasi)
    private readonly deklarasiRepository: Repository<Deklarasi>,
  ) {}

  // <--- membuat saldo transfer baru dan otomatis membuat deklarasi DRAFT di belakang layar --->
  async buatSaldo(data: BuatSaldoDto) {
    const idPengguna = Number(data.id_pengguna);
    const nominalTransfer = Number(data.nominal_transfer);

    if (!Number.isFinite(idPengguna) || idPengguna <= 0) {
      throw new BadRequestException('Pengguna wajib dipilih.');
    }

    if (!Number.isFinite(nominalTransfer) || nominalTransfer <= 0) {
      throw new BadRequestException('Nominal transfer wajib lebih dari 0.');
    }

    if (!data.jenis_saldo) {
      throw new BadRequestException('Jenis saldo wajib dipilih.');
    }

    if (!data.tanggal_transfer) {
      throw new BadRequestException('Tanggal transfer wajib diisi.');
    }

    const saldo = this.saldoRepository.create({
      id_pengguna: idPengguna,

      nrp: data.nrp ? data.nrp.trim() : '',

      nama_pengguna: data.nama_pengguna ? data.nama_pengguna.trim() : '',

      lokasi: data.lokasi ? data.lokasi.trim() : null,

      jenis_saldo: data.jenis_saldo,

      nominal_transfer: nominalTransfer,

      total_penggunaan: 0,

      sisa_saldo: nominalTransfer,

      tanggal_transfer: data.tanggal_transfer,

      keterangan: data.keterangan ? data.keterangan.trim() : null,

      nomor_std:
        data.nomor_std && data.nomor_std.trim()
          ? data.nomor_std.trim()
          : null,

      status_saldo: 'AKTIF',

      nama_file_bukti_pengembalian: null,

      path_file_bukti_pengembalian: null,

      status_bukti_pengembalian: 'BELUM_UPLOAD',

      alasan_bukti_pengembalian_ditolak: null,

      tanggal_upload_bukti_pengembalian: null,

      tanggal_verifikasi_pengembalian: null,
    });

    const saldoTersimpan = await this.saldoRepository.save(saldo);

    const deklarasiAktif = await this.pastikanDeklarasiSaldoAda(saldoTersimpan);

    return {
      ...saldoTersimpan,
      id_deklarasi_aktif: deklarasiAktif.id,
      kode_deklarasi_aktif: deklarasiAktif.kode_deklarasi,
      status_deklarasi_aktif: deklarasiAktif.status,
    };
  }
  // <--- end --->

  // <--- otomatis membuat deklarasi DRAFT jika saldo belum punya deklarasi --->
  private async pastikanDeklarasiSaldoAda(saldo: Saldo) {
    const deklarasiAda = await this.deklarasiRepository.findOne({
      where: {
        id_saldo: saldo.id,
      },
      order: {
        dibuat_pada: 'DESC',
      },
    });

    if (deklarasiAda) {
      return deklarasiAda;
    }

    const tanggalKegiatan =
      saldo.tanggal_transfer || new Date().toISOString().slice(0, 10);

    const deklarasi = this.deklarasiRepository.create({
      kode_deklarasi: buatKodeDeklarasi(),

      id_pengguna: saldo.id_pengguna,

      id_saldo: saldo.id,

      nrp: saldo.nrp || '',

      nama_pengguna: saldo.nama_pengguna || '',

      jenis_deklarasi: saldo.jenis_saldo,

      tanggal_kegiatan: tanggalKegiatan,

      lokasi: saldo.lokasi || '-',

      keterangan: saldo.keterangan || 'Deklarasi otomatis dari saldo transfer FA',

      nomor_std: saldo.nomor_std || null,

      total_nominal: 0,

      status: 'DRAFT',
    });

    return this.deklarasiRepository.save(deklarasi);
  }
  // <--- end --->

  // <--- kompres bukti pengembalian saldo menjadi JPG kualitas 75% --->
  private async kompresBuktiPengembalian(file: Express.Multer.File) {
    if (!file || !file.path) {
      throw new BadRequestException('File bukti pengembalian wajib diunggah.');
    }

    const lokasiAsli = file.path;
    const folderFile = path.dirname(lokasiAsli);
    const namaFileTanpaExt = path.parse(file.filename).name;
    const namaFileJpg = `${namaFileTanpaExt}.jpg`;

    const lokasiFinal = path.join(folderFile, namaFileJpg);
    const lokasiSementara = path.join(
      folderFile,
      `${namaFileTanpaExt}-compressed-${Date.now()}.jpg`,
    );

    try {
      await sharp(lokasiAsli)
        .rotate()
        .resize({
          width: 1600,
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 75,
          mozjpeg: true,
        })
        .toFile(lokasiSementara);

      try {
        await fs.unlink(lokasiAsli);
      } catch {
        // abaikan jika file asli tidak ada
      }

      await fs.rename(lokasiSementara, lokasiFinal);

      file.filename = namaFileJpg;
      file.path = lokasiFinal;
      file.mimetype = 'image/jpeg';

      console.log('Bukti pengembalian berhasil dikompres:', {
        nama_file: file.filename,
        path_file: file.path,
        quality: 75,
      });

      return file;
    } catch (error) {
      try {
        await fs.unlink(lokasiSementara);
      } catch {
        // abaikan jika file sementara tidak ada
      }

      console.error(
        'Kompres bukti pengembalian gagal, file asli tetap dipakai:',
        error,
      );

      return file;
    }
  }
  // <--- end --->

  // <--- mengambil semua transaksi saldo --->
  async ambilSemuaSaldo() {
    return this.saldoRepository.find({
      order: {
        dibuat_pada: 'DESC',
      },
    });
  }
  // <--- end --->

  // <--- mengambil semua saldo pengguna --->
  async ambilSaldoBerdasarkanPengguna(idPengguna: number) {
    return this.saldoRepository.find({
      where: {
        id_pengguna: idPengguna,
      },
      order: {
        dibuat_pada: 'DESC',
      },
    });
  }
  // <--- end --->

  // <--- mengambil saldo aktif pengguna + id deklarasi aktif untuk upload nota dari dashboard --->
  async ambilSaldoAktifPengguna(idPengguna: number) {
    const daftarSaldo = await this.saldoRepository.find({
      where: {
        id_pengguna: idPengguna,
      },
      order: {
        tanggal_transfer: 'DESC',
        dibuat_pada: 'DESC',
      },
    });

    /*
     * Saldo aktif adalah semua yang belum SELESAI.
     * MENUNGGU_PENGEMBALIAN tetap tampil karena karyawan wajib upload bukti pengembalian.
     * MELEBIHI_NOMINAL tetap tampil sebagai data minus, tapi nanti frontend menghitungnya terpisah.
     */
    const daftarAktif = daftarSaldo.filter((saldo) => {
      return saldo.status_saldo !== 'SELESAI';
    });

    const hasil: any[] = [];

    for (const saldo of daftarAktif) {
      const deklarasiAktif = await this.pastikanDeklarasiSaldoAda(saldo);

      hasil.push({
        ...saldo,
        id_deklarasi_aktif: deklarasiAktif.id,
        kode_deklarasi_aktif: deklarasiAktif.kode_deklarasi,
        status_deklarasi_aktif: deklarasiAktif.status,
      });
    }

    return hasil;
  }
  // <--- end --->

  // <--- mengambil saldo berdasarkan ID --->
  async ambilSaldoBerdasarkanId(idSaldo: number) {
    const saldo = await this.saldoRepository.findOne({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    return saldo;
  }
  // <--- end --->

  // <--- menghitung ulang saldo satu deklarasi, minus diperbolehkan --->
  async hitungUlangSaldo(idSaldo: number, totalPenggunaan: number) {
    const saldo = await this.saldoRepository.findOne({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    if (saldo.status_saldo === 'SELESAI') {
      return saldo;
    }

    const nominalTransfer = Number(saldo.nominal_transfer || 0);
    const totalPakai = Math.max(Number(totalPenggunaan || 0), 0);
    const sisaSaldo = nominalTransfer - totalPakai;

    saldo.total_penggunaan = totalPakai;
    saldo.sisa_saldo = sisaSaldo;

    /*
     * Minus boleh.
     * Total sisa saldo di frontend nanti hanya menghitung AKTIF, ADA_SISA,
     * dan MENUNGGU_PENGEMBALIAN yang sisanya positif.
     */
    if (saldo.status_saldo === 'MENUNGGU_PENGEMBALIAN') {
      if (sisaSaldo > 0) {
        saldo.status_saldo = 'MENUNGGU_PENGEMBALIAN';
      } else if (sisaSaldo === 0) {
        saldo.status_saldo = 'PAS';
        saldo.status_bukti_pengembalian = 'BELUM_UPLOAD';
      } else {
        saldo.status_saldo = 'MELEBIHI_NOMINAL';
        saldo.status_bukti_pengembalian = 'BELUM_UPLOAD';
      }
    } else if (sisaSaldo < 0) {
      saldo.status_saldo = 'MELEBIHI_NOMINAL';
      saldo.status_bukti_pengembalian = 'BELUM_UPLOAD';
    } else if (sisaSaldo === 0) {
      saldo.status_saldo = 'PAS';
      saldo.status_bukti_pengembalian = 'BELUM_UPLOAD';
    } else if (totalPakai > 0 && sisaSaldo > 0) {
      saldo.status_saldo = 'ADA_SISA';
    } else {
      saldo.status_saldo = 'AKTIF';
    }

    return this.saldoRepository.save(saldo);
  }
  // <--- end --->

  // <--- upload bukti pengembalian saldo sisa oleh karyawan --->
  async uploadBuktiPengembalian(
    idSaldo: number,
    file: Express.Multer.File,
    nominalPengembalianInput: number = 0,
  ) {
    const saldo = await this.ambilSaldoBerdasarkanId(idSaldo);

    if (saldo.status_saldo !== 'MENUNGGU_PENGEMBALIAN') {
      throw new BadRequestException(
        'Bukti pengembalian hanya dapat diupload ketika status saldo MENUNGGU_PENGEMBALIAN.',
      );
    }

    const sisaSaldo = Number(saldo.sisa_saldo || 0);
    const nominalPengembalian = Number(nominalPengembalianInput || 0);

    if (sisaSaldo <= 0) {
      throw new BadRequestException(
        'Saldo ini tidak memiliki sisa yang perlu dikembalikan.',
      );
    }

    if (!Number.isFinite(nominalPengembalian) || nominalPengembalian <= 0) {
      throw new BadRequestException(
        'Nominal pengembalian wajib diisi lebih dari 0.',
      );
    }

    if (!file) {
      throw new BadRequestException('File bukti pengembalian wajib diunggah.');
    }

    const fileFinal = await this.kompresBuktiPengembalian(file);

    if (saldo.path_file_bukti_pengembalian) {
      try {
        await fs.unlink(`.${saldo.path_file_bukti_pengembalian}`);
      } catch {
        // abaikan file lama yang tidak ditemukan
      }
    }

    saldo.nominal_pengembalian = nominalPengembalian;
    saldo.nama_file_bukti_pengembalian = fileFinal.filename;
    saldo.path_file_bukti_pengembalian = `/uploads/pengembalian/${fileFinal.filename}`;
    saldo.status_bukti_pengembalian = 'DIAJUKAN';
    saldo.alasan_bukti_pengembalian_ditolak = null;
    saldo.tanggal_upload_bukti_pengembalian = new Date();
    saldo.tanggal_verifikasi_pengembalian = null;

    return this.saldoRepository.save(saldo);
  }
  // <--- end --->

  // <--- admin / FA setujui atau tolak bukti pengembalian --->
  async ubahStatusBuktiPengembalian(
    idSaldo: number,
    statusBukti: string,
    alasanDitolak?: string,
  ) {
    const saldo = await this.ambilSaldoBerdasarkanId(idSaldo);

    const statusFinal = String(statusBukti || '')
      .trim()
      .toUpperCase() as StatusBuktiPengembalian;

    if (!['DISETUJUI', 'DITOLAK'].includes(statusFinal)) {
      throw new BadRequestException(
        'Status bukti pengembalian tidak valid. Gunakan DISETUJUI atau DITOLAK.',
      );
    }

    if (saldo.status_saldo !== 'MENUNGGU_PENGEMBALIAN') {
      throw new BadRequestException(
        'Bukti pengembalian hanya dapat dikoreksi ketika saldo MENUNGGU_PENGEMBALIAN.',
      );
    }

    if (!saldo.path_file_bukti_pengembalian) {
      throw new BadRequestException(
        'Bukti pengembalian belum diupload oleh karyawan.',
      );
    }

    if (statusFinal === 'DITOLAK') {
      const alasan = String(alasanDitolak || '').trim();

      if (!alasan) {
        throw new BadRequestException('Alasan penolakan bukti wajib diisi.');
      }

      saldo.status_bukti_pengembalian = 'DITOLAK';
      saldo.alasan_bukti_pengembalian_ditolak = alasan;
      saldo.tanggal_verifikasi_pengembalian = new Date();

      return this.saldoRepository.save(saldo);
    }

    saldo.status_bukti_pengembalian = 'DISETUJUI';
    saldo.alasan_bukti_pengembalian_ditolak = null;
    saldo.tanggal_verifikasi_pengembalian = new Date();

    /*
     * Setelah bukti pengembalian disetujui Admin / FA,
     * saldo baru benar-benar selesai dan hilang dari Saldo Aktif.
     */
    saldo.status_saldo = 'SELESAI';

    return this.saldoRepository.save(saldo);
  }
  // <--- end --->

  // <--- mengunci saldo manual jika memang diperlukan admin / FA --->
  async selesaikanSaldo(idSaldo: number) {
    const saldo = await this.ambilSaldoBerdasarkanId(idSaldo);

    saldo.status_saldo = 'SELESAI';

    return this.saldoRepository.save(saldo);
  }
  // <--- end --->
}
// <--- end --->