import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Deklarasi } from '../deklarasi/deklarasi.entity';
import { Nota } from '../nota/nota.entity';
import { Pengajuan } from '../pengajuan/pengajuan.entity';
import { DatabaseSettlement } from './database-settlement.entity';

@Injectable()
export class DatabaseSettlementService {
  constructor(
    @InjectRepository(DatabaseSettlement)
    private readonly databaseSettlementRepository: Repository<DatabaseSettlement>,

    @InjectRepository(Nota)
    private readonly notaRepository: Repository<Nota>,

    @InjectRepository(Deklarasi)
    private readonly deklarasiRepository: Repository<Deklarasi>,

    @InjectRepository(Pengajuan)
    private readonly pengajuanRepository: Repository<Pengajuan>,
  ) {}

  private ubahKeTanggalIso(nilai: string | Date | null | undefined) {
    if (!nilai) {
      return new Date().toISOString().slice(0, 10);
    }

    const tanggal = nilai instanceof Date ? nilai : new Date(nilai);

    if (Number.isNaN(tanggal.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }

    return tanggal.toISOString().slice(0, 10);
  }

  private rapikanKategori(kategori: string | null | undefined) {
    if (!kategori) {
      return 'UANG OPERASIONAL';
    }

    return kategori.replace(/_/g, ' ').trim();
  }

  private ambilNamaBarangJasa(nota: Nota) {
    const dataNota = nota as any;

    const barangJasa = String(dataNota.barang_jasa || '').trim();

    if (barangJasa) {
      return barangJasa;
    }

    return this.rapikanKategori(dataNota.kategori_nota);
  }

  private ambilKeterangan(nota: Nota, namaBarangJasa: string) {
    const dataNota = nota as any;

    const keteranganSettlement = String(
      dataNota.keterangan_settlement || '',
    ).trim();

    if (keteranganSettlement) {
      return keteranganSettlement;
    }

    return namaBarangJasa;
  }

  private ambilNamaKolomDeklarasi(kandidat: string[]) {
    const daftarKolom = this.deklarasiRepository.metadata.columns.map(
      (kolom) => kolom.propertyName,
    );

    return kandidat.find((namaKolom) => daftarKolom.includes(namaKolom));
  }

  private async ambilNomorRabDariPengajuan(idSaldo: number | null) {
    if (!idSaldo) {
      return null;
    }

    const pengajuan = await this.pengajuanRepository.findOne({
      where: {
        id_saldo: idSaldo,
      },
    });

    const nomorRab = String((pengajuan as any)?.nomor_rab || '').trim();

    return nomorRab || null;
  }

  private ambilNamaKolomNota(kandidat: string[]) {
    const daftarKolom = this.notaRepository.metadata.columns.map(
      (kolom) => kolom.propertyName,
    );

    return kandidat.find((namaKolom) => daftarKolom.includes(namaKolom));
  }

  private ambilNilaiDeklarasi(deklarasi: Deklarasi, kandidat: string[]) {
    const dataDeklarasi = deklarasi as any;

    for (const namaKolom of kandidat) {
      if (
        dataDeklarasi[namaKolom] !== undefined &&
        dataDeklarasi[namaKolom] !== null &&
        String(dataDeklarasi[namaKolom]).trim() !== ''
      ) {
        return dataDeklarasi[namaKolom];
      }
    }

    return null;
  }

  private async ambilNotaDeklarasi(idDeklarasi: number) {
    const kolomIdDeklarasi = this.ambilNamaKolomNota([
      'id_deklarasi',
      'deklarasi_id',
      'idDeklarasi',
    ]);

    if (!kolomIdDeklarasi) {
      return [];
    }

    return this.notaRepository.find({
      where: {
        [kolomIdDeklarasi]: idDeklarasi,
      } as any,
      order: {
        dibuat_pada: 'ASC',
        id: 'ASC',
      } as any,
    });
  }

  async sinkronkanDariDeklarasi(deklarasi: Deklarasi) {
    const dataDeklarasi = deklarasi as any;

    const jenisDeklarasi = String(
      this.ambilNilaiDeklarasi(deklarasi, [
        'jenis_deklarasi',
        'jenis',
        'tipe_deklarasi',
      ]) || '',
    ).toUpperCase();

    if (!jenisDeklarasi.includes('UANG_OPERASIONAL')) {
      return [];
    }

    await this.databaseSettlementRepository.delete({
      id_deklarasi: dataDeklarasi.id,
    });

    const daftarNota = await this.ambilNotaDeklarasi(dataDeklarasi.id);

    if (daftarNota.length === 0) {
      return [];
    }

    const nomorSettlement = String(dataDeklarasi.id).padStart(3, '0');

    const tanggalPembuatan = this.ubahKeTanggalIso(
      this.ambilNilaiDeklarasi(deklarasi, [
        'dibuat_pada',
        'created_at',
        'createdAt',
        'tanggal_pengajuan',
        'tanggal',
      ]),
    );

    let nomorRabPb =
      this.ambilNilaiDeklarasi(deklarasi, [
        'nomor_rab',
        'nomor_pb',
        'nomor_std',
        'kode_deklarasi',
      ]) || nomorSettlement;

    const namaPengguna =
      this.ambilNilaiDeklarasi(deklarasi, [
        'nama_pengguna',
        'nama_karyawan',
        'nama',
        'pic',
      ]) || null;

    const idPengguna =
      Number(
        this.ambilNilaiDeklarasi(deklarasi, [
          'id_pengguna',
          'pengguna_id',
          'idPengguna',
        ]),
      ) || 0;

    const idSaldo =
      Number(
        this.ambilNilaiDeklarasi(deklarasi, [
          'id_saldo',
          'saldo_id',
          'idSaldo',
        ]),
      ) || null;

    const nomorRabDariPengajuan = await this.ambilNomorRabDariPengajuan(idSaldo);

    if (nomorRabDariPengajuan) {
      nomorRabPb = nomorRabDariPengajuan;
    }

    const daftarDatabaseSettlement = daftarNota.map((nota, index) => {
      const dataNota = nota as any;

      const item = index + 1;

      const nominal = Number(
        dataNota.nominal_final ||
          dataNota.nominal_ocr ||
          dataNota.nominal ||
          dataNota.total ||
          0,
      );

      const namaBarangJasa = this.ambilNamaBarangJasa(nota);
      const itemSett = `${nomorSettlement}-${item}`;

      return this.databaseSettlementRepository.create({
        id_deklarasi: dataDeklarasi.id,
        id_saldo: idSaldo,
        id_pengguna: idPengguna,
        kode_jangan_diubah: `${item}${Number(dataDeklarasi.id)}`,
        nomor_settlement: nomorSettlement,
        item,
        item_sett: itemSett,
        department: 'HCGA',
        tanggal_pembuatan: tanggalPembuatan,
        tanggal_per_item: this.ubahKeTanggalIso(
          dataNota.dibuat_pada || dataNota.created_at || dataNota.createdAt,
        ),
        nama_barang_jasa: namaBarangJasa,
        qty: 1,
        harga_per_qty: nominal,
        total: nominal,
        keterangan: this.ambilKeterangan(nota, namaBarangJasa),
        cost_center: 'HCGA',
        nomor_rab_pb: String(nomorRabPb || ''),
        pic: String(dataNota.pic_settlement || '').trim() || namaPengguna,
        status_data: 'AKTIF',
      });
    });

    return this.databaseSettlementRepository.save(daftarDatabaseSettlement);
  }

  async sinkronkanDataLamaDisetujui() {
    const kolomJenis = this.ambilNamaKolomDeklarasi([
      'jenis_deklarasi',
      'jenis',
      'tipe_deklarasi',
    ]);

    const kolomStatus = this.ambilNamaKolomDeklarasi([
      'status',
      'status_deklarasi',
      'status_pengajuan',
    ]);

    if (!kolomJenis || !kolomStatus) {
      return;
    }

    const daftarDeklarasi = await this.deklarasiRepository.find({
      where: {
        [kolomJenis]: In([
          'UANG_OPERASIONAL',
          'uang_operasional',
          'Uang Operasional',
          'UANG OPERASIONAL',
        ]),
        [kolomStatus]: In([
          'DISETUJUI',
          'Disetujui',
          'disetujui',
          'APPROVED',
          'approved',
        ]),
      } as any,
      order: {
        id: 'DESC',
      } as any,
    });

    for (const deklarasi of daftarDeklarasi) {
      const dataDeklarasi = deklarasi as any;

      const jumlahDataSudahAda = await this.databaseSettlementRepository.count({
        where: {
          id_deklarasi: dataDeklarasi.id,
          status_data: 'AKTIF',
        },
      });

      if (jumlahDataSudahAda === 0) {
        await this.sinkronkanDariDeklarasi(deklarasi);
      }
    }
  }

  async ambilSemua() {
    await this.sinkronkanDataLamaDisetujui();

    return this.databaseSettlementRepository.find({
      where: {
        status_data: 'AKTIF',
      },
      order: {
        nomor_settlement: 'DESC',
        item: 'ASC',
      } as any,
    });
  }

  async ambilBerdasarkanPengguna(idPengguna: number) {
    await this.sinkronkanDataLamaDisetujui();

    return this.databaseSettlementRepository.find({
      where: {
        id_pengguna: idPengguna,
        status_data: 'AKTIF',
      },
      order: {
        nomor_settlement: 'DESC',
        item: 'ASC',
      } as any,
    });
  }

  async ambilBerdasarkanDeklarasi(idDeklarasi: number) {
    await this.sinkronkanDataLamaDisetujui();

    const data = await this.databaseSettlementRepository.find({
      where: {
        id_deklarasi: idDeklarasi,
        status_data: 'AKTIF',
      },
      order: {
        item: 'ASC',
      } as any,
    });

    if (data.length === 0) {
      throw new NotFoundException(
        'Database settlement belum tersedia untuk deklarasi ini.',
      );
    }

    return data;
  }
}