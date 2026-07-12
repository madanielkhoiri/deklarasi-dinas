import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import { Repository } from 'typeorm';

import { Pengguna } from '../pengguna/pengguna.entity';
import { SaldoService } from '../saldo/saldo.service';
import { BuatPengajuanDto } from './dto/buat-pengajuan.dto';
import { UpdateStatusPengajuanDto } from './dto/update-status-pengajuan.dto';
import { Pengajuan } from './pengajuan.entity';

// <--- fitur service pengajuan STD, RAB, approval FA, notif WA, dan bukti transfer --->
@Injectable()
export class PengajuanService {
  constructor(
    @InjectRepository(Pengajuan)
    private readonly pengajuanRepository: Repository<Pengajuan>,

    @InjectRepository(Pengguna)
    private readonly penggunaRepository: Repository<Pengguna>,

    private readonly saldoService: SaldoService,
  ) {}

  // <--- membuat pengajuan baru dengan file STD dan RAB + notif WA ke FA --->
  async buatPengajuan(
    data: BuatPengajuanDto,
    fileStd: Express.Multer.File | undefined,
    fileRab: Express.Multer.File | undefined,
  ) {
    const idPengguna = Number(data.id_pengguna);

    if (!Number.isInteger(idPengguna) || idPengguna <= 0) {
      throw new BadRequestException('Pengguna wajib dipilih.');
    }

    if (data.jenis_pengajuan === 'PERJALANAN_DINAS' && !fileStd) {
      throw new BadRequestException('File STD wajib diupload untuk Perjalanan Dinas.');
    }

    if (!fileRab) {
      throw new BadRequestException('File RAB wajib diupload.');
    }

    if (!data.jenis_pengajuan) {
      throw new BadRequestException('Jenis pengajuan wajib dipilih.');
    }

    if (
      data.jenis_pengajuan === 'PERJALANAN_DINAS' &&
      (!data.nomor_std || !data.nomor_std.trim())
    ) {
      throw new BadRequestException('Nomor STD wajib diisi untuk Perjalanan Dinas.');
    }

    if (
      data.jenis_pengajuan === 'UANG_OPERASIONAL' &&
      (!data.nomor_rab || !data.nomor_rab.trim())
    ) {
      throw new BadRequestException('Nomor RAB wajib diisi untuk Uang Operasional.');
    }

    const pengguna = await this.penggunaRepository.findOne({
      where: {
        id: idPengguna,
      },
    });

    if (!pengguna) {
      throw new NotFoundException('Data karyawan tidak ditemukan.');
    }

    if (!pengguna.aktif) {
      throw new BadRequestException('Akun karyawan tidak aktif.');
    }

    const tanggalPengajuan =
      data.tanggal_pengajuan && data.tanggal_pengajuan.trim()
        ? data.tanggal_pengajuan.trim()
        : new Date().toISOString().slice(0, 10);

    const pengajuan = this.pengajuanRepository.create({
      id_pengguna: pengguna.id,

      nrp: data.nrp && data.nrp.trim() ? data.nrp.trim() : pengguna.nrp,

      nama_pengguna:
        data.nama_pengguna && data.nama_pengguna.trim()
          ? data.nama_pengguna.trim()
          : pengguna.nama,

      jenis_pengajuan: data.jenis_pengajuan,

      lokasi: data.lokasi && data.lokasi.trim() ? data.lokasi.trim() : null,

      keterangan:
        data.keterangan && data.keterangan.trim()
          ? data.keterangan.trim()
          : null,

      nomor_std:
        data.nomor_std && data.nomor_std.trim()
          ? data.nomor_std.trim()
          : null,

      nomor_rab:
        data.nomor_rab && data.nomor_rab.trim()
          ? data.nomor_rab.trim()
          : null,

      nama_file_std: fileStd ? fileStd.filename : null,

      path_file_std: fileStd ? `/uploads/pengajuan/${fileStd.filename}` : null,

      nama_file_rab: fileRab.filename,

      path_file_rab: `/uploads/pengajuan/${fileRab.filename}`,

      nominal_transfer: 0,

      nama_file_bukti_transfer: null,

      path_file_bukti_transfer: null,

      tanggal_transfer: null,

      id_saldo: null,

      status_pengajuan: 'DIAJUKAN',

      catatan_admin: null,

      tanggal_pengajuan: tanggalPengajuan,
    });

    const pengajuanTersimpan = await this.pengajuanRepository.save(pengajuan);

    /*
     * Saat Admin/Super Admin membuat pengajuan,
     * sistem langsung memberi notifikasi WA ke semua akun FA aktif.
     */
    await this.kirimNotifikasiPengajuanBaruKeFa(pengajuanTersimpan);

    return pengajuanTersimpan;
  }
  // <--- end --->

  // <--- mengambil semua pengajuan --->
  async ambilSemuaPengajuan() {
    return this.pengajuanRepository.find({
      order: {
        dibuat_pada: 'DESC',
      },
    });
  }
  // <--- end --->

  // <--- mengambil pengajuan berdasarkan pengguna --->
  async ambilPengajuanBerdasarkanPengguna(idPengguna: number) {
    if (!Number.isInteger(idPengguna) || idPengguna <= 0) {
      throw new BadRequestException('ID pengguna tidak valid.');
    }

    return this.pengajuanRepository.find({
      where: {
        id_pengguna: idPengguna,
      },
      order: {
        dibuat_pada: 'DESC',
      },
    });
  }
  // <--- end --->

  // <--- mengambil detail pengajuan --->
  async ambilPengajuanBerdasarkanId(idPengajuan: number) {
    if (!Number.isInteger(idPengajuan) || idPengajuan <= 0) {
      throw new BadRequestException('ID pengajuan tidak valid.');
    }

    const pengajuan = await this.pengajuanRepository.findOne({
      where: {
        id: idPengajuan,
      },
    });

    if (!pengajuan) {
      throw new NotFoundException('Pengajuan tidak ditemukan.');
    }

    return pengajuan;
  }
  // <--- end --->

  // <--- FA setuju/tolak pengajuan --->
  async updateStatusPengajuan(
    idPengajuan: number,
    data: UpdateStatusPengajuanDto,
  ) {
    const pengajuan = await this.ambilPengajuanBerdasarkanId(idPengajuan);

    if (!data.status_pengajuan) {
      throw new BadRequestException('Status pengajuan wajib dipilih.');
    }

    if (pengajuan.status_pengajuan === 'SELESAI') {
      throw new BadRequestException(
        'Pengajuan yang sudah selesai tidak dapat diubah kembali.',
      );
    }

    if (
      pengajuan.status_pengajuan === 'MENUNGGU_TRANSFER' &&
      data.status_pengajuan !== 'MENUNGGU_TRANSFER'
    ) {
      throw new BadRequestException(
        'Pengajuan yang sudah menunggu transfer tidak dapat diubah kembali.',
      );
    }

    if (data.status_pengajuan === 'DITOLAK') {
      if (!data.catatan_admin || !data.catatan_admin.trim()) {
        throw new BadRequestException(
          'Alasan penolakan wajib diisi jika pengajuan ditolak.',
        );
      }

      pengajuan.status_pengajuan = 'DITOLAK';

      pengajuan.catatan_admin = data.catatan_admin.trim();

      return this.pengajuanRepository.save(pengajuan);
    }

    if (data.status_pengajuan === 'MENUNGGU_TRANSFER') {
      if (pengajuan.status_pengajuan !== 'DIAJUKAN') {
        throw new BadRequestException(
          'Hanya pengajuan berstatus Diajukan yang dapat disetujui FA.',
        );
      }

      pengajuan.status_pengajuan = 'MENUNGGU_TRANSFER';

      pengajuan.catatan_admin =
        data.catatan_admin && data.catatan_admin.trim()
          ? data.catatan_admin.trim()
          : 'Pengajuan disetujui oleh FA dan menunggu proses transfer.';

      return this.pengajuanRepository.save(pengajuan);
    }

    pengajuan.status_pengajuan = data.status_pengajuan;

    pengajuan.catatan_admin =
      data.catatan_admin && data.catatan_admin.trim()
        ? data.catatan_admin.trim()
        : null;

    return this.pengajuanRepository.save(pengajuan);
  }
  // <--- end --->

  // <--- FA upload bukti transfer lalu saldo otomatis masuk ke akun karyawan --->
  async uploadBuktiTransfer(
    idPengajuan: number,
    fileBuktiTransfer: Express.Multer.File | undefined,
    data: {
      nominal_transfer?: string | number;
      tanggal_transfer?: string;
      keterangan?: string;
    },
  ) {
    const pengajuan = await this.ambilPengajuanBerdasarkanId(idPengajuan);

    if (!fileBuktiTransfer) {
      throw new BadRequestException('Bukti transfer wajib diupload.');
    }

    if (pengajuan.status_pengajuan !== 'MENUNGGU_TRANSFER') {
      throw new BadRequestException(
        'Bukti transfer hanya dapat diupload ketika status pengajuan Menunggu Transfer.',
      );
    }

    if (pengajuan.id_saldo) {
      throw new BadRequestException(
        'Pengajuan ini sudah memiliki saldo transfer.',
      );
    }

    const nominalTransfer = Number(data.nominal_transfer);

    if (!Number.isFinite(nominalTransfer) || nominalTransfer <= 0) {
      throw new BadRequestException('Nominal transfer wajib lebih dari 0.');
    }

    const tanggalTransfer =
      data.tanggal_transfer && String(data.tanggal_transfer).trim()
        ? String(data.tanggal_transfer).trim()
        : new Date().toISOString().slice(0, 10);

    const saldo = await this.saldoService.buatSaldo({
      id_pengguna: pengajuan.id_pengguna,

      nrp: pengajuan.nrp,

      nama_pengguna: pengajuan.nama_pengguna,

      lokasi: pengajuan.lokasi || undefined,

      jenis_saldo: pengajuan.jenis_pengajuan,

      nominal_transfer: nominalTransfer,

      tanggal_transfer: tanggalTransfer,

      keterangan:
        data.keterangan && String(data.keterangan).trim()
          ? String(data.keterangan).trim()
          : `Saldo dari pengajuan #${pengajuan.id}`,

      nomor_std: pengajuan.nomor_std || undefined,
    });

    pengajuan.nominal_transfer = nominalTransfer;

    pengajuan.nama_file_bukti_transfer = fileBuktiTransfer.filename;

    pengajuan.path_file_bukti_transfer = `/uploads/pengajuan/${fileBuktiTransfer.filename}`;

    pengajuan.tanggal_transfer = tanggalTransfer;

    pengajuan.id_saldo = saldo.id;

    pengajuan.status_pengajuan = 'SELESAI';

    pengajuan.catatan_admin = pengajuan.catatan_admin || null;

    return this.pengajuanRepository.save(pengajuan);
  }
  // <--- end --->

  // <--- hapus pengajuan dan file STD/RAB/bukti transfer --->
  async hapusPengajuan(idPengajuan: number) {
    const pengajuan = await this.ambilPengajuanBerdasarkanId(idPengajuan);

    if (
      pengajuan.status_pengajuan === 'MENUNGGU_TRANSFER' ||
      pengajuan.status_pengajuan === 'SELESAI'
    ) {
      throw new BadRequestException(
        'Pengajuan yang sudah masuk proses transfer tidak dapat dihapus.',
      );
    }

    await this.pengajuanRepository.remove(pengajuan);

    if (pengajuan.path_file_std) {
      if (pengajuan.path_file_std) {
      await this.hapusFileJikaAda(`.${pengajuan.path_file_std}`);
    }
    }

    await this.hapusFileJikaAda(`.${pengajuan.path_file_rab}`);

    if (pengajuan.path_file_bukti_transfer) {
      await this.hapusFileJikaAda(`.${pengajuan.path_file_bukti_transfer}`);
    }

    return {
      message: 'Pengajuan berhasil dihapus.',
      id_pengajuan: idPengajuan,
    };
  }
  // <--- end --->

  // <--- kirim notifikasi WA pengajuan baru ke akun FA --->
  private async kirimNotifikasiPengajuanBaruKeFa(pengajuan: Pengajuan) {
    const tokenFonnte = process.env.FONNTE_TOKEN || '';

    if (!tokenFonnte) {
      console.log(
        'Notif WA dilewati: FONNTE_TOKEN belum diisi di file .env.',
      );
      return;
    }

    const daftarFa = await this.penggunaRepository.find({
      where: {
        role: 'FA',
        aktif: true,
      },
    });

    const daftarNomor = daftarFa
      .map((fa) => this.normalisasiNomorWa(fa.nomor_telepon || ''))
      .filter(Boolean);

    if (daftarNomor.length === 0) {
      console.log(
        'Notif WA dilewati: tidak ada akun FA aktif yang memiliki nomor WA.',
      );
      return;
    }

    const pesan = [
      'PENGAJUAN BARU MASUK',
      '',
      `ID Pengajuan: #${pengajuan.id}`,
      `Nama Karyawan: ${pengajuan.nama_pengguna}`,
      `NRP: ${pengajuan.nrp}`,
      `Jenis: ${this.formatJenisPengajuan(pengajuan.jenis_pengajuan)}`,
      `Lokasi: ${pengajuan.lokasi || '-'}`,
      `Tanggal Pengajuan: ${pengajuan.tanggal_pengajuan}`,
      '',
      'Silakan FA melakukan review STD dan RAB pada sistem.',
      'Pilih Setuju untuk melanjutkan transfer, atau Tolak jika pengajuan belum sesuai.',
    ].join('\n');

    await this.kirimWaFonnte(daftarNomor, pesan);
  }
  // <--- end --->

  // <--- helper kirim WA menggunakan Fonnte --->
  private async kirimWaFonnte(daftarNomor: string[], pesan: string) {
    const tokenFonnte = process.env.FONNTE_TOKEN || '';

    if (!tokenFonnte) {
      console.log('Kirim WA dilewati: FONNTE_TOKEN kosong.');
      return;
    }

    if (daftarNomor.length === 0) {
      console.log('Kirim WA dilewati: target nomor kosong.');
      return;
    }

    try {
      const formData = new FormData();

      formData.append('target', daftarNomor.join(','));
      formData.append('message', pesan);
      formData.append('countryCode', '62');

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: tokenFonnte,
        },
        body: formData,
      });

      const hasil = await response.text();

      console.log('Hasil kirim WA Fonnte:', hasil);
    } catch (error) {
      console.error('Gagal kirim notif WA Fonnte:', error);
    }
  }
  // <--- end --->

  private normalisasiNomorWa(nomor: string) {
    const angka = nomor.replace(/\D/g, '');

    if (!angka) {
      return '';
    }

    if (angka.startsWith('62')) {
      return angka;
    }

    if (angka.startsWith('0')) {
      return `62${angka.slice(1)}`;
    }

    return angka;
  }

  private formatJenisPengajuan(
    jenis: 'PERJALANAN_DINAS' | 'UANG_OPERASIONAL',
  ) {
    if (jenis === 'PERJALANAN_DINAS') {
      return 'Perjalanan Dinas';
    }

    if (jenis === 'UANG_OPERASIONAL') {
      return 'Uang Operasional';
    }

    return jenis;
  }

  private async hapusFileJikaAda(pathFile: string) {
    try {
      await fs.unlink(pathFile);
    } catch {
      // abaikan jika file sudah tidak ada
    }
  }
}
// <--- end --->