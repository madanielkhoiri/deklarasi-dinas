import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type KategoriNota =
  | 'MAKAN'
  | 'AKOMODASI'
  | 'TRANSPORTASI'
  | 'LAUNDRY'
  | 'DANA_OPERASIONAL_W1'
  | 'DANA_OPERASIONAL_W2'
  | 'DANA_OPERASIONAL_BOD'
  | 'DANA_OPERASIONAL_BYD'
  | 'DANA_OPERASIONAL_KHUSUS';

// <--- fitur entity nota deklarasi dengan kategori perjalanan dinas dan dana operasional --->
@Entity('nota')
export class Nota {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  id_deklarasi!: number;

  @Column({
    type: 'enum',
    enum: [
      'MAKAN',
      'AKOMODASI',
      'TRANSPORTASI',
      'LAUNDRY',
      'DANA_OPERASIONAL_W1',
      'DANA_OPERASIONAL_W2',
      'DANA_OPERASIONAL_BOD',
      'DANA_OPERASIONAL_BYD',
      'DANA_OPERASIONAL_KHUSUS',
    ],
    nullable: true,
  })
  kategori_nota!: KategoriNota | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  barang_jasa!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  pic_settlement!: string | null;

  @Column({ type: 'text', nullable: true })
  keterangan_settlement!: string | null;

  @Column({ type: 'int', default: 1 })
  jumlah_item_settlement!: number;

  @Column({ length: 180 })
  nama_file!: string;

  @Column({ length: 255 })
  path_file!: string;

  @Column({ type: 'text', nullable: true })
  hasil_ocr_text!: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  nominal_ocr!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  nominal_final!: number;

  @Column({ default: false })
  apakah_dikoreksi!: boolean;

  @Column({ type: 'text', nullable: true })
  alasan_koreksi!: string | null;

  @Column({
    type: 'enum',
    enum: ['BELUM_OCR', 'OCR_SELESAI', 'DIVERIFIKASI', 'DITOLAK'],
    default: 'BELUM_OCR',
  })
  status_verifikasi!: 'BELUM_OCR' | 'OCR_SELESAI' | 'DIVERIFIKASI' | 'DITOLAK';

  @CreateDateColumn()
  dibuat_pada!: Date;

  @UpdateDateColumn()
  diperbarui_pada!: Date;
}
// <--- end --->