import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { buatKodeDeklarasi } from '../bantuan/kode-deklarasi.bantuan';
import { DatabaseSettlementService } from '../database-settlement/database-settlement.service';
import { Saldo } from '../saldo/saldo.entity';
import { Deklarasi } from './deklarasi.entity';
import { BuatDeklarasiDto } from './dto/buat-deklarasi.dto';
import { EditDeklarasiDto } from './dto/edit-deklarasi.dto';
import { UbahStatusDeklarasiDto } from './dto/ubah-status-deklarasi.dto';

// <--- fitur service deklarasi perjalanan dinas --->
@Injectable()
export class DeklarasiService {
  constructor(
    @InjectRepository(Deklarasi)
    private readonly deklarasiRepository: Repository<Deklarasi>,

    @InjectRepository(Saldo)
    private readonly saldoRepository: Repository<Saldo>,

    private readonly databaseSettlementService: DatabaseSettlementService,
  ) {}

  // <--- membuat deklarasi manual lama, tetap dipertahankan untuk kompatibilitas --->
  async buatDeklarasi(data: BuatDeklarasiDto) {
    const idPengguna = Number(data.id_pengguna);
    const idSaldo = Number(data.id_saldo);

    if (!Number.isInteger(idPengguna) || idPengguna <= 0) {
      throw new BadRequestException('ID pengguna tidak valid.');
    }

    if (!Number.isInteger(idSaldo) || idSaldo <= 0) {
      throw new BadRequestException('Saldo wajib dipilih.');
    }

    const saldo = await this.saldoRepository.findOne({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo yang dipilih tidak ditemukan.');
    }

    if (Number(saldo.id_pengguna) !== idPengguna) {
      throw new BadRequestException(
        'Saldo tersebut bukan milik pengguna ini.',
      );
    }

    if (saldo.jenis_saldo !== data.jenis_deklarasi) {
      throw new BadRequestException(
        'Jenis saldo tidak sesuai dengan jenis deklarasi.',
      );
    }

    if (saldo.status_saldo === 'SELESAI') {
      throw new BadRequestException(
        'Saldo ini sudah selesai dan tidak dapat digunakan lagi.',
      );
    }

    const deklarasiDenganSaldoSama = await this.deklarasiRepository.findOne({
      where: {
        id_saldo: idSaldo,
      },
    });

    if (deklarasiDenganSaldoSama) {
      throw new BadRequestException(
        `Saldo ini sudah digunakan oleh deklarasi ${deklarasiDenganSaldoSama.kode_deklarasi}.`,
      );
    }

    const nrp = data.nrp.trim();
    const namaPengguna = data.nama_pengguna.trim();
    const lokasi = data.lokasi.trim();
    const keterangan = data.keterangan.trim();

    if (!nrp) {
      throw new BadRequestException('NRP wajib diisi.');
    }

    if (!namaPengguna) {
      throw new BadRequestException('Nama pengguna wajib diisi.');
    }

    if (!lokasi) {
      throw new BadRequestException('Lokasi wajib diisi.');
    }

    if (!keterangan) {
      throw new BadRequestException('Keterangan wajib diisi.');
    }

    const deklarasi = this.deklarasiRepository.create({
      kode_deklarasi: buatKodeDeklarasi(),

      id_pengguna: idPengguna,

      id_saldo: idSaldo,

      nrp,

      nama_pengguna: namaPengguna,

      jenis_deklarasi: data.jenis_deklarasi,

      tanggal_kegiatan: data.tanggal_kegiatan,

      lokasi,

      keterangan,

      total_nominal: 0,

      status: 'DRAFT',
    });

    return this.deklarasiRepository.save(deklarasi);
  }
  // <--- end --->

  // <--- mengambil semua deklarasi --->
  async ambilSemuaDeklarasi() {
    return this.deklarasiRepository.find({
      order: {
        dibuat_pada: 'DESC',
      },
    });
  }
  // <--- end --->

  // <--- mengambil deklarasi pengguna --->
  async ambilDeklarasiBerdasarkanPengguna(idPengguna: number) {
    return this.deklarasiRepository.find({
      where: {
        id_pengguna: idPengguna,
      },
      order: {
        dibuat_pada: 'DESC',
      },
    });
  }
  // <--- end --->

  // <--- mengambil detail deklarasi --->
  async ambilDetailDeklarasi(id: number) {
    const deklarasi = await this.deklarasiRepository.findOne({
      where: {
        id,
      },
    });

    if (!deklarasi) {
      throw new NotFoundException('Deklarasi tidak ditemukan.');
    }

    return deklarasi;
  }
  // <--- end --->

  // <--- mengedit data deklarasi --->
  async editDeklarasi(idDeklarasi: number, data: EditDeklarasiDto) {
    const deklarasi = await this.deklarasiRepository.findOne({
      where: {
        id: idDeklarasi,
      },
    });

    if (!deklarasi) {
      throw new NotFoundException('Deklarasi tidak ditemukan.');
    }

    if (!['DRAFT', 'DITOLAK'].includes(deklarasi.status)) {
      throw new BadRequestException(
        'Deklarasi hanya dapat diedit ketika berstatus DRAFT atau DITOLAK.',
      );
    }

    const lokasi = data.lokasi.trim();
    const keterangan = data.keterangan.trim();

    if (!data.tanggal_kegiatan) {
      throw new BadRequestException('Tanggal kegiatan wajib diisi.');
    }

    if (!lokasi) {
      throw new BadRequestException('Lokasi wajib diisi.');
    }

    if (!keterangan) {
      throw new BadRequestException('Keterangan wajib diisi.');
    }

    deklarasi.tanggal_kegiatan = data.tanggal_kegiatan;
    deklarasi.lokasi = lokasi;
    deklarasi.keterangan = keterangan;

    if (deklarasi.status === 'DITOLAK') {
      deklarasi.status = 'DRAFT';
    }

    return this.deklarasiRepository.save(deklarasi);
  }
  // <--- end --->

  // <--- karyawan mengajukan / mengajukan ulang deklarasi tanpa menutup saldo --->
  async ajukanDeklarasi(idDeklarasi: number) {
    if (!Number.isInteger(idDeklarasi) || idDeklarasi <= 0) {
      throw new BadRequestException('ID deklarasi tidak valid.');
    }

    const deklarasi = await this.deklarasiRepository.findOne({
      where: {
        id: idDeklarasi,
      },
    });

    if (!deklarasi) {
      throw new NotFoundException('Deklarasi tidak ditemukan.');
    }

    if (!['DRAFT', 'DITOLAK'].includes(deklarasi.status)) {
      throw new BadRequestException(
        'Deklarasi hanya dapat diajukan ketika status DRAFT atau DITOLAK.',
      );
    }

    if (!deklarasi.id_saldo) {
      throw new BadRequestException('Deklarasi belum memiliki saldo.');
    }

    if (Number(deklarasi.total_nominal || 0) <= 0) {
      throw new BadRequestException(
        'Minimal harus ada satu nota sebelum deklarasi diajukan.',
      );
    }

    const saldo = await this.saldoRepository.findOne({
      where: {
        id: deklarasi.id_saldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    if (saldo.status_saldo === 'SELESAI') {
      throw new BadRequestException(
        'Saldo sudah selesai. Deklarasi tidak dapat diajukan ulang.',
      );
    }

    deklarasi.status = 'DIAJUKAN';

    return this.deklarasiRepository.save(deklarasi);
  }
  // <--- end --->

  // <--- update status saldo berdasarkan hasil akhir deklarasi --->
  private async updateStatusSaldoSetelahDeklarasiDisetujui(
    idSaldo: number | null,
  ) {
    if (!idSaldo) {
      return null;
    }

    const saldo = await this.saldoRepository.findOne({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    const sisaSaldo = Number(saldo.sisa_saldo || 0);

    /*
     * Jika sisa > 0:
     * karyawan wajib upload bukti pengembalian.
     *
     * Jika sisa = 0:
     * saldo langsung selesai.
     *
     * Jika sisa < 0:
     * saldo minus, tidak perlu upload bukti pengembalian,
     * tapi tetap terdata sebagai MELEBIHI_NOMINAL.
     */
    if (sisaSaldo > 0) {
      saldo.status_saldo = 'MENUNGGU_PENGEMBALIAN';

      if (
        !saldo.status_bukti_pengembalian ||
        saldo.status_bukti_pengembalian === 'DISETUJUI'
      ) {
        saldo.status_bukti_pengembalian = 'BELUM_UPLOAD';
      }

      saldo.alasan_bukti_pengembalian_ditolak = null;
      saldo.tanggal_verifikasi_pengembalian = null;
    } else if (sisaSaldo === 0) {
      saldo.status_saldo = 'SELESAI';
      saldo.status_bukti_pengembalian = 'BELUM_UPLOAD';
      saldo.alasan_bukti_pengembalian_ditolak = null;
    } else {
      saldo.status_saldo = 'MELEBIHI_NOMINAL';
      saldo.status_bukti_pengembalian = 'BELUM_UPLOAD';
      saldo.alasan_bukti_pengembalian_ditolak = null;
    }

    return this.saldoRepository.save(saldo);
  }
  // <--- end --->

  // <--- update status saldo saat deklarasi ditolak agar tetap aktif untuk revisi --->
  private async updateStatusSaldoSaatDeklarasiDitolak(idSaldo: number | null) {
    if (!idSaldo) {
      return null;
    }

    const saldo = await this.saldoRepository.findOne({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    const sisaSaldo = Number(saldo.sisa_saldo || 0);
    const totalPenggunaan = Number(saldo.total_penggunaan || 0);

    if (sisaSaldo < 0) {
      saldo.status_saldo = 'MELEBIHI_NOMINAL';
    } else if (sisaSaldo === 0) {
      saldo.status_saldo = 'PAS';
    } else if (totalPenggunaan > 0 && sisaSaldo > 0) {
      saldo.status_saldo = 'ADA_SISA';
    } else {
      saldo.status_saldo = 'AKTIF';
    }

    return this.saldoRepository.save(saldo);
  }
  // <--- end --->

  // <--- mengubah status deklarasi oleh admin / admin FA --->
  async ubahStatusDeklarasi(idDeklarasi: number, data: UbahStatusDeklarasiDto) {
    const deklarasi = await this.deklarasiRepository.findOne({
      where: {
        id: idDeklarasi,
      },
    });

    if (!deklarasi) {
      throw new NotFoundException('Deklarasi tidak ditemukan.');
    }

    if (data.status === 'DIVERIFIKASI') {
      if (deklarasi.status !== 'DIAJUKAN') {
        throw new BadRequestException(
          'Hanya deklarasi DIAJUKAN yang dapat diverifikasi.',
        );
      }

      deklarasi.status = 'DIVERIFIKASI';
    }

    if (data.status === 'DISETUJUI') {
      if (!['DIAJUKAN', 'DIVERIFIKASI'].includes(deklarasi.status)) {
        throw new BadRequestException(
          'Hanya deklarasi DIAJUKAN atau DIVERIFIKASI yang dapat disetujui.',
        );
      }

      deklarasi.status = 'DISETUJUI';

      await this.updateStatusSaldoSetelahDeklarasiDisetujui(
        deklarasi.id_saldo,
      );

      await this.deklarasiRepository.save(deklarasi);

      await this.databaseSettlementService.sinkronkanDariDeklarasi(deklarasi);
    }

    if (data.status === 'DITOLAK') {
      if (!['DIAJUKAN', 'DIVERIFIKASI'].includes(deklarasi.status)) {
        throw new BadRequestException(
          'Hanya deklarasi DIAJUKAN atau DIVERIFIKASI yang dapat ditolak.',
        );
      }

      const alasan = data.alasan_ditolak?.trim();

      if (!alasan) {
        throw new BadRequestException('Alasan penolakan wajib diisi.');
      }

      deklarasi.status = 'DITOLAK';

      deklarasi.keterangan = `${deklarasi.keterangan}\n\nALASAN DITOLAK: ${alasan}`;

      await this.updateStatusSaldoSaatDeklarasiDitolak(deklarasi.id_saldo);
    }

    return this.deklarasiRepository.save(deklarasi);
  }
  // <--- end --->

  // <--- ringkasan dashboard admin --->
  async ambilRingkasanAdmin() {
    const daftarDeklarasi = await this.deklarasiRepository.find({
      order: {
        dibuat_pada: 'DESC',
      },
    });

    const totalDeklarasi = daftarDeklarasi.length;

    const totalDraft = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DRAFT',
    ).length;

    const totalDiajukan = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DIAJUKAN',
    ).length;

    const totalDiverifikasi = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DIVERIFIKASI',
    ).length;

    const totalDisetujui = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DISETUJUI',
    ).length;

    const totalDitolak = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DITOLAK',
    ).length;

    const totalPenggunaan = daftarDeklarasi.reduce((total, deklarasi) => {
      return total + Number(deklarasi.total_nominal || 0);
    }, 0);

    return {
      total_deklarasi: totalDeklarasi,

      total_draft: totalDraft,

      total_diajukan: totalDiajukan,

      total_diverifikasi: totalDiverifikasi,

      total_disetujui: totalDisetujui,

      total_ditolak: totalDitolak,

      total_penggunaan: totalPenggunaan,

      daftar_deklarasi: daftarDeklarasi,
    };
  }
  // <--- end --->
}
// <--- end --->