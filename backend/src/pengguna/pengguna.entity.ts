import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// <--- fitur entity pengguna / akun aplikasi --->
@Entity('pengguna')
export class Pengguna {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nrp!: string;

  @Column({ type: 'varchar', length: 150 })
  nama!: string;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  nomor_telepon!: string | null;

  @Column({ type: 'varchar', length: 255 })
  kata_sandi!: string;

  @Column({
    type: 'enum',
    enum: ['SUPER_ADMIN', 'FA', 'KARYAWAN'],
    default: 'KARYAWAN',
  })
  role!: 'SUPER_ADMIN' | 'FA' | 'KARYAWAN';

  @Column({ type: 'boolean', default: true })
  aktif!: boolean;

  @Column({ type: 'varchar', length: 80, nullable: true })
  kode_tiket!: string | null;

  @CreateDateColumn()
  dibuat_pada!: Date;

  @UpdateDateColumn()
  diperbarui_pada!: Date;
}
// <--- end --->