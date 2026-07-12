import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// <--- fitur entity pengajuan STD, RAB, dan bukti transfer --->
@Entity('pengajuan')
export class Pengajuan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  id_pengguna!: number;

  @Column({ type: 'varchar', length: 50 })
  nrp!: string;

  @Column({ type: 'varchar', length: 150 })
  nama_pengguna!: string;

  @Column({
    type: 'enum',
    enum: ['PERJALANAN_DINAS', 'UANG_OPERASIONAL'],
    default: 'PERJALANAN_DINAS',
  })
  jenis_pengajuan!: 'PERJALANAN_DINAS' | 'UANG_OPERASIONAL';

  @Column({ type: 'varchar', length: 120, nullable: true })
  lokasi!: string | null;

  @Column({ type: 'text', nullable: true })
  keterangan!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  nomor_std!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  nomor_rab!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nama_file_std!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path_file_std!: string | null;

  @Column({ type: 'varchar', length: 255 })
  nama_file_rab!: string;

  @Column({ type: 'varchar', length: 255 })
  path_file_rab!: string;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
  })
  nominal_transfer!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nama_file_bukti_transfer!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path_file_bukti_transfer!: string | null;

  @Column({ type: 'date', nullable: true })
  tanggal_transfer!: string | null;

  @Column({ type: 'int', nullable: true })
  id_saldo!: number | null;

  @Column({
    type: 'enum',
    enum: [
      'DIAJUKAN',
      'DISETUJUI',
      'DITOLAK',
      'MENUNGGU_TRANSFER',
      'SELESAI',
    ],
    default: 'DIAJUKAN',
  })
  status_pengajuan!:
    | 'DIAJUKAN'
    | 'DISETUJUI'
    | 'DITOLAK'
    | 'MENUNGGU_TRANSFER'
    | 'SELESAI';

  @Column({ type: 'text', nullable: true })
  catatan_admin!: string | null;

  @Column({ type: 'date' })
  tanggal_pengajuan!: string;

  @CreateDateColumn()
  dibuat_pada!: Date;

  @UpdateDateColumn()
  diperbarui_pada!: Date;
}
// <--- end --->