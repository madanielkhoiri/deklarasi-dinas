import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// <--- fitur entity saldo karyawan + bukti pengembalian --->
@Entity('saldo')
export class Saldo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  id_pengguna!: number;

  @Column()
  nrp!: string;

  @Column()
  nama_pengguna!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  lokasi!: string | null;

  @Column({
    type: 'enum',
    enum: ['PERJALANAN_DINAS', 'UANG_OPERASIONAL'],
  })
  jenis_saldo!: 'PERJALANAN_DINAS' | 'UANG_OPERASIONAL';

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
  })
  nominal_transfer!: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
  })
  total_penggunaan!: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
  })
  sisa_saldo!: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
  })
  nominal_pengembalian!: number;

  @Column({ type: 'date' })
  tanggal_transfer!: string;

  @Column({ type: 'text', nullable: true })
  keterangan!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  nomor_std!: string | null;

  @Column({
    type: 'enum',
    enum: [
      'AKTIF',
      'PAS',
      'ADA_SISA',
      'MELEBIHI_NOMINAL',
      'MENUNGGU_PENGEMBALIAN',
      'SELESAI',
    ],
    default: 'AKTIF',
  })
  status_saldo!:
    | 'AKTIF'
    | 'PAS'
    | 'ADA_SISA'
    | 'MELEBIHI_NOMINAL'
    | 'MENUNGGU_PENGEMBALIAN'
    | 'SELESAI';

  @Column({ type: 'varchar', length: 255, nullable: true })
  nama_file_bukti_pengembalian!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path_file_bukti_pengembalian!: string | null;

  @Column({
    type: 'enum',
    enum: ['BELUM_UPLOAD', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK'],
    default: 'BELUM_UPLOAD',
  })
  status_bukti_pengembalian!:
    | 'BELUM_UPLOAD'
    | 'DIAJUKAN'
    | 'DISETUJUI'
    | 'DITOLAK';

  @Column({ type: 'text', nullable: true })
  alasan_bukti_pengembalian_ditolak!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  tanggal_upload_bukti_pengembalian!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  tanggal_verifikasi_pengembalian!: Date | null;

  @CreateDateColumn()
  dibuat_pada!: Date;

  @UpdateDateColumn()
  diperbarui_pada!: Date;
}
// <--- end --->