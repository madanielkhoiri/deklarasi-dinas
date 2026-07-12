import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Repository } from 'typeorm';

import { Deklarasi } from '../deklarasi/deklarasi.entity';
import { SaldoService } from '../saldo/saldo.service';
import { KategoriNota, Nota } from './nota.entity';
import { OcrSpaceService } from './ocr-space.service';

declare const require: any;
const sharpModule = require('sharp');
const sharp = sharpModule.default || sharpModule;

type StatusVerifikasiNota =
  | 'BELUM_OCR'
  | 'OCR_SELESAI'
  | 'DIVERIFIKASI'
  | 'DITOLAK';

// <--- fitur service nota deklarasi dengan revisi nota ditolak --->
@Injectable()
export class NotaService {
  constructor(
    @InjectRepository(Nota)
    private readonly notaRepository: Repository<Nota>,

    @InjectRepository(Deklarasi)
    private readonly deklarasiRepository: Repository<Deklarasi>,

    private readonly saldoService: SaldoService,

    private readonly ocrSpaceService: OcrSpaceService,
  ) {}

  // <--- mengambil dan memvalidasi deklarasi --->
  private async ambilDeklarasiAtauGagal(idDeklarasi: number) {
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

    return deklarasi;
  }
  // <--- end --->

  // <--- mengambil nota atau gagal --->
  private async ambilNotaAtauGagal(idNota: number) {
    if (!Number.isInteger(idNota) || idNota <= 0) {
      throw new BadRequestException('ID nota tidak valid.');
    }

    const nota = await this.notaRepository.findOne({
      where: {
        id: idNota,
      },
    });

    if (!nota) {
      throw new NotFoundException('Nota tidak ditemukan.');
    }

    return nota;
  }
  // <--- end --->

  // <--- memastikan deklarasi masih bisa diedit oleh karyawan --->
  private pastikanDeklarasiBisaDiedit(deklarasi: Deklarasi) {
    if (!['DRAFT', 'DITOLAK'].includes(deklarasi.status)) {
      throw new BadRequestException(
        'Nota hanya dapat diubah ketika deklarasi berstatus DRAFT atau DITOLAK.',
      );
    }
  }
  // <--- end --->

  // <--- memastikan deklarasi bisa dikoreksi admin / FA --->
  private pastikanDeklarasiBisaDikoreksi(deklarasi: Deklarasi) {
    if (!['DIAJUKAN', 'DIVERIFIKASI', 'DITOLAK'].includes(deklarasi.status)) {
      throw new BadRequestException(
        'Nota hanya dapat dikoreksi ketika deklarasi sudah diajukan.',
      );
    }
  }
  // <--- end --->

  // <--- memastikan saldo belum selesai --->
  private async pastikanSaldoBelumSelesai(deklarasi: Deklarasi) {
    if (!deklarasi.id_saldo) {
      throw new BadRequestException('Deklarasi belum terhubung dengan saldo.');
    }

    const saldo = await this.saldoService.ambilSaldoBerdasarkanId(
      deklarasi.id_saldo,
    );

    if (saldo.status_saldo === 'SELESAI') {
      throw new BadRequestException(
        'Saldo sudah selesai. Nota tidak dapat ditambahkan atau dikoreksi lagi.',
      );
    }

    return saldo;
  }
  // <--- end --->

  // <--- validasi kategori nota berdasarkan jenis deklarasi --->
  private validasiKategoriNota(
    deklarasi: Deklarasi,
    kategoriNota: string | undefined | null,
  ): KategoriNota {
    const kategori = String(kategoriNota || '').trim().toUpperCase();

    const kategoriPerjalananDinas: KategoriNota[] = [
      'MAKAN',
      'AKOMODASI',
      'TRANSPORTASI',
      'LAUNDRY',
    ];

    const kategoriDanaOperasional: KategoriNota[] = [
      'DANA_OPERASIONAL_W1',
      'DANA_OPERASIONAL_W2',
      'DANA_OPERASIONAL_BOD',
      'DANA_OPERASIONAL_BYD',
      'DANA_OPERASIONAL_KHUSUS',
    ];

    if (deklarasi.jenis_deklarasi === 'PERJALANAN_DINAS') {
      if (!kategoriPerjalananDinas.includes(kategori as KategoriNota)) {
        throw new BadRequestException(
          'Kategori nota Perjalanan Dinas wajib dipilih: MAKAN, AKOMODASI, TRANSPORTASI, atau LAUNDRY.',
        );
      }

      return kategori as KategoriNota;
    }

    if (deklarasi.jenis_deklarasi === 'UANG_OPERASIONAL') {
      if (!kategoriDanaOperasional.includes(kategori as KategoriNota)) {
        throw new BadRequestException(
          'Kategori nota Dana Operasional wajib dipilih: DANA_OPERASIONAL_W1, DANA_OPERASIONAL_W2, DANA_OPERASIONAL_BOD, DANA_OPERASIONAL_BYD, atau DANA_OPERASIONAL_KHUSUS.',
        );
      }

      return kategori as KategoriNota;
    }

    throw new BadRequestException('Jenis deklarasi tidak valid.');
  }
  // <--- end --->

  // <--- hapus file jika ada --->
  private async hapusFileJikaAda(pathFile: string | null | undefined) {
    if (!pathFile) {
      return;
    }

    try {
      const lokasiFile = pathFile.startsWith('/')
        ? `.${pathFile}`
        : pathFile;

      await fs.unlink(lokasiFile);
    } catch {
      // abaikan jika file sudah tidak ada
    }
  }
  // <--- end --->

  // <--- hapus nota ditolak saat karyawan upload nota revisi --->
  private async hapusNotaDitolakSebagaiRevisi(
    idDeklarasi: number,
    idNotaRevisi?: number,
  ) {
    const daftarNotaDitolak = await this.notaRepository.find({
      where: {
        id_deklarasi: idDeklarasi,
        status_verifikasi: 'DITOLAK',
      },
      order: {
        dibuat_pada: 'ASC',
      },
    });

    if (daftarNotaDitolak.length === 0) {
      throw new BadRequestException(
        'Tidak ada nota ditolak yang perlu direvisi.',
      );
    }

    let notaYangDiganti: Nota | undefined;

    if (Number.isInteger(idNotaRevisi) && Number(idNotaRevisi) > 0) {
      notaYangDiganti = daftarNotaDitolak.find((nota) => {
        return Number(nota.id) === Number(idNotaRevisi);
      });

      if (!notaYangDiganti) {
        throw new BadRequestException(
          'Nota revisi yang dipilih tidak valid atau bukan status DITOLAK.',
        );
      }
    } else {
      if (daftarNotaDitolak.length > 1) {
        throw new BadRequestException(
          'Ada lebih dari satu nota ditolak. Pilih nota yang akan direvisi.',
        );
      }

      notaYangDiganti = daftarNotaDitolak[0];
    }

    await this.hapusFileJikaAda(notaYangDiganti.path_file);

    await this.notaRepository.remove(notaYangDiganti);
  }
  // <--- end --->

  // <--- kompres foto nota menjadi JPG kualitas 75%, jika gagal tetap pakai file asli --->
  private async kompresFotoNota(file: Express.Multer.File) {
    if (!file || !file.path) {
      throw new BadRequestException('File nota wajib diunggah.');
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

      console.log('Foto nota berhasil dikompres:', {
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

      console.error('Kompres foto nota gagal, file asli tetap dipakai:', error);

      return file;
    }
  }
  // <--- end --->

  // <--- menyimpan upload nota satu per satu + revisi mengganti nota ditolak --->
  async simpanNotaUpload(
    idDeklarasi: number,
    file: Express.Multer.File,
    kategoriNota: string,
    idNotaRevisi?: number,
    barangJasa?: string,
    picSettlement?: string,
    keteranganSettlement?: string,
    jumlahItemSettlement?: number,
  ) {
    const deklarasi = await this.ambilDeklarasiAtauGagal(idDeklarasi);

    this.pastikanDeklarasiBisaDiedit(deklarasi);

    await this.pastikanSaldoBelumSelesai(deklarasi);

    if (!file) {
      throw new BadRequestException('File nota wajib diunggah.');
    }
const kategoriFinal = this.validasiKategoriNota(deklarasi, kategoriNota);

    const jumlahItemSettlementFinal = Math.max(
      1,
      Math.floor(Number(jumlahItemSettlement || 1)),
    );

    /*
     * PENTING:
     * Kalau deklarasi sedang DITOLAK, upload nota baru dianggap sebagai revisi.
     * Maka nota lama yang statusnya DITOLAK diganti dengan nota baru.
     */
    if (deklarasi.status === 'DITOLAK' || Number(idNotaRevisi || 0) > 0) {
      await this.hapusNotaDitolakSebagaiRevisi(idDeklarasi, idNotaRevisi);
    }

    const fileKompres = await this.kompresFotoNota(file);

    let hasilOcrText = 'OCR otomatis gagal. Silakan isi nominal manual.';
    let nominalOcr = 0;
    let statusVerifikasi: StatusVerifikasiNota = 'BELUM_OCR';

    try {
      const lokasiFile = fileKompres.path.replace(/\\/g, '/');

      const hasilOcr = await this.ocrSpaceService.bacaNota(lokasiFile);

      hasilOcrText = hasilOcr.hasil_ocr_text;

      nominalOcr = Number(hasilOcr.nominal_ocr || 0);

      statusVerifikasi = nominalOcr > 0 ? 'OCR_SELESAI' : 'BELUM_OCR';
    } catch (error) {
      console.error('OCR.space gagal:', error);
    }

    const nota = this.notaRepository.create({
      id_deklarasi: idDeklarasi,

      kategori_nota: kategoriFinal,

      barang_jasa:
        barangJasa && String(barangJasa).trim()
          ? String(barangJasa).trim()
          : null,

      pic_settlement:
        picSettlement && String(picSettlement).trim()
          ? String(picSettlement).trim()
          : null,

      keterangan_settlement:
        keteranganSettlement && String(keteranganSettlement).trim()
          ? String(keteranganSettlement).trim()
          : null,

      jumlah_item_settlement: jumlahItemSettlementFinal,

      nama_file: fileKompres.filename,

      path_file: `/uploads/nota/${fileKompres.filename}`,

      hasil_ocr_text: hasilOcrText,

      nominal_ocr: nominalOcr,

      nominal_final: nominalOcr,

      apakah_dikoreksi: false,

      alasan_koreksi: null,

      status_verifikasi: statusVerifikasi,
    });

    const notaTersimpan = await this.notaRepository.save(nota);

    await this.hitungUlangTotalDeklarasiDanSaldo(idDeklarasi);

    return notaTersimpan;
  }
  // <--- end --->

  // <--- mengambil nota berdasarkan deklarasi --->
  async ambilNotaBerdasarkanDeklarasi(idDeklarasi: number) {
    await this.ambilDeklarasiAtauGagal(idDeklarasi);

    return this.notaRepository.find({
      where: {
        id_deklarasi: idDeklarasi,
      },
      order: {
        dibuat_pada: 'ASC',
      },
    });
  }
  // <--- end --->

  // <--- koreksi manual nominal OCR --->
  async isiNominalOcrSementara(idNota: number, nominal: number) {
    if (!Number.isFinite(nominal) || nominal <= 0) {
      throw new BadRequestException('Nominal harus diisi lebih dari 0.');
    }

    const nota = await this.ambilNotaAtauGagal(idNota);

    const deklarasi = await this.ambilDeklarasiAtauGagal(nota.id_deklarasi);

    /*
     * Koreksi OCR manual boleh sebelum deklarasi selesai final.
     * Karyawan dapat koreksi saat DRAFT/DITOLAK.
     * Admin/FA dapat koreksi saat DIAJUKAN/DIVERIFIKASI/DITOLAK.
     */
    if (
      !['DRAFT', 'DITOLAK', 'DIAJUKAN', 'DIVERIFIKASI'].includes(
        deklarasi.status,
      )
    ) {
      throw new BadRequestException(
        'Koreksi OCR manual tidak dapat dilakukan setelah deklarasi disetujui final.',
      );
    }

    await this.pastikanSaldoBelumSelesai(deklarasi);

    nota.hasil_ocr_text =
      nota.hasil_ocr_text || 'Nominal dikoreksi manual oleh pengguna.';

    nota.nominal_ocr = nominal;

    nota.nominal_final = nominal;

    nota.apakah_dikoreksi = true;

    nota.alasan_koreksi = 'Koreksi manual nominal OCR';

    nota.status_verifikasi = 'OCR_SELESAI';

    const notaTersimpan = await this.notaRepository.save(nota);

    await this.hitungUlangTotalDeklarasiDanSaldo(nota.id_deklarasi);

    return notaTersimpan;
  }
  // <--- end --->

  // <--- admin / FA setujui atau tolak nota per gambar --->
  async ubahStatusNota(
    idNota: number,
    statusVerifikasi: string,
    alasanKoreksi?: string,
  ) {
    const nota = await this.ambilNotaAtauGagal(idNota);

    const deklarasi = await this.ambilDeklarasiAtauGagal(nota.id_deklarasi);

    this.pastikanDeklarasiBisaDikoreksi(deklarasi);

    await this.pastikanSaldoBelumSelesai(deklarasi);

    const statusFinal = String(statusVerifikasi || '')
      .trim()
      .toUpperCase() as StatusVerifikasiNota;

    const daftarStatusDiizinkan: StatusVerifikasiNota[] = [
      'OCR_SELESAI',
      'DIVERIFIKASI',
      'DITOLAK',
    ];

    if (!daftarStatusDiizinkan.includes(statusFinal)) {
      throw new BadRequestException(
        'Status nota tidak valid. Gunakan OCR_SELESAI, DIVERIFIKASI, atau DITOLAK.',
      );
    }

    if (statusFinal === 'DITOLAK') {
      const alasan = String(alasanKoreksi || '').trim();

      if (!alasan) {
        throw new BadRequestException('Alasan penolakan nota wajib diisi.');
      }

      nota.status_verifikasi = 'DITOLAK';

      nota.alasan_koreksi = alasan;

      nota.apakah_dikoreksi = true;

      deklarasi.status = 'DITOLAK';

      await this.deklarasiRepository.save(deklarasi);
    }

    if (statusFinal === 'DIVERIFIKASI') {
      if (Number(nota.nominal_final || 0) <= 0) {
        throw new BadRequestException(
          'Nota belum memiliki nominal final. Koreksi nominal terlebih dahulu.',
        );
      }

      nota.status_verifikasi = 'DIVERIFIKASI';

      nota.alasan_koreksi = null;
    }

    if (statusFinal === 'OCR_SELESAI') {
      nota.status_verifikasi = 'OCR_SELESAI';

      nota.alasan_koreksi = null;
    }

    const notaTersimpan = await this.notaRepository.save(nota);

    await this.hitungUlangTotalDeklarasiDanSaldo(nota.id_deklarasi);

    return notaTersimpan;
  }
  // <--- end --->

  // <--- menghitung total deklarasi dan saldo terkait, nota ditolak tidak dihitung --->
  async hitungUlangTotalDeklarasiDanSaldo(idDeklarasi: number) {
    const deklarasi = await this.ambilDeklarasiAtauGagal(idDeklarasi);

    const daftarNota = await this.notaRepository.find({
      where: {
        id_deklarasi: idDeklarasi,
      },
    });

    const totalNominal = daftarNota.reduce((total, nota) => {
      if (nota.status_verifikasi === 'DITOLAK') {
        return total;
      }

      return total + Number(nota.nominal_final || 0);
    }, 0);

    deklarasi.total_nominal = totalNominal;

    await this.deklarasiRepository.save(deklarasi);

    if (deklarasi.id_saldo) {
      await this.saldoService.hitungUlangSaldo(
        deklarasi.id_saldo,
        totalNominal,
      );
    }

    return deklarasi;
  }
  // <--- end --->

  // <--- menghapus nota --->
  async hapusNota(idNota: number) {
    const nota = await this.ambilNotaAtauGagal(idNota);

    const deklarasi = await this.ambilDeklarasiAtauGagal(nota.id_deklarasi);

    this.pastikanDeklarasiBisaDiedit(deklarasi);

    await this.pastikanSaldoBelumSelesai(deklarasi);

    const idDeklarasi = nota.id_deklarasi;

    await this.notaRepository.remove(nota);

    await this.hapusFileJikaAda(nota.path_file);

    await this.hitungUlangTotalDeklarasiDanSaldo(idDeklarasi);

    return {
      message: 'Nota berhasil dihapus.',

      id_nota: idNota,

      id_deklarasi: idDeklarasi,
    };
  }
  // <--- end --->
}
// <--- end --->