import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// <--- fitur entity pengguna / akun aplikasi --->
@Entity('users', { synchronize: false })
export class Pengguna {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  nrp!: string | null;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: true })
  username!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  nama!: string;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: true })
  email!: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  nomor_telepon!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  kata_sandi!: string;

  @Column({
    type: 'enum',
    enum: ['SUPER_ADMIN', 'FA', 'KARYAWAN'],
    default: 'KARYAWAN',
  })
  role!: 'SUPER_ADMIN' | 'FA' | 'KARYAWAN';

  @Column({ name: 'is_active', type: 'boolean', default: true })
  aktif!: boolean;

  @Column({ name: 'kode_tiket', type: 'varchar', length: 80, nullable: true })
  kode_tiket!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  dibuat_pada!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  diperbarui_pada!: Date;
}
// <--- end --->