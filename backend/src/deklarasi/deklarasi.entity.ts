import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// <--- fitur entity deklarasi perjalanan dinas --->
@Entity('deklarasi')
export class Deklarasi {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 80 })
  kode_deklarasi!: string;

  @Column()
  id_pengguna!: number;

  @Column({ type: 'int', nullable: true })
  id_saldo!: number | null;

  @Column({ length: 50 })
  nrp!: string;

  @Column({ length: 120 })
  nama_pengguna!: string;

  @Column({
    type: 'enum',
    enum: ['PERJALANAN_DINAS', 'UANG_OPERASIONAL'],
  })
  jenis_deklarasi!: 'PERJALANAN_DINAS' | 'UANG_OPERASIONAL';

  @Column({ type: 'date' })
  tanggal_kegiatan!: string;

  @Column({ length: 150 })
  lokasi!: string;

  @Column({ type: 'text' })
  keterangan!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  nomor_std!: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_nominal!: number;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'DIAJUKAN', 'DIVERIFIKASI', 'DISETUJUI', 'DITOLAK'],
    default: 'DRAFT',
  })
  status!: 'DRAFT' | 'DIAJUKAN' | 'DIVERIFIKASI' | 'DISETUJUI' | 'DITOLAK';

  @CreateDateColumn()
  dibuat_pada!: Date;

  @UpdateDateColumn()
  diperbarui_pada!: Date;
}
// <--- end --->