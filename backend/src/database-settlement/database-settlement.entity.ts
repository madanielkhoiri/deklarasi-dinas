import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// <--- fitur entity database settlement uang operasional --->
@Entity('database_settlement')
@Index(['id_deklarasi', 'item'], { unique: true })
export class DatabaseSettlement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  id_deklarasi!: number;

  @Column({ type: 'int', nullable: true })
  id_saldo!: number | null;

  @Column()
  id_pengguna!: number;

  @Column({ type: 'varchar', length: 50 })
  kode_jangan_diubah!: string;

  @Column({ type: 'varchar', length: 50 })
  nomor_settlement!: string;

  @Column({ type: 'int' })
  item!: number;

  @Column({ type: 'varchar', length: 50 })
  item_sett!: string;

  @Column({ type: 'varchar', length: 120, default: 'HCGA' })
  department!: string;

  @Column({ type: 'date' })
  tanggal_pembuatan!: string;

  @Column({ type: 'date' })
  tanggal_per_item!: string;

  @Column({ type: 'varchar', length: 255 })
  nama_barang_jasa!: string;

  @Column('decimal', { precision: 15, scale: 2, default: 1 })
  qty!: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  harga_per_qty!: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  total!: number;

  @Column({ type: 'text', nullable: true })
  keterangan!: string | null;

  @Column({ type: 'varchar', length: 120, default: 'HCGA' })
  cost_center!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  nomor_rab_pb!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  pic!: string | null;

  @Column({
    type: 'enum',
    enum: ['AKTIF', 'DIBATALKAN'],
    default: 'AKTIF',
  })
  status_data!: 'AKTIF' | 'DIBATALKAN';

  @CreateDateColumn()
  dibuat_pada!: Date;

  @UpdateDateColumn()
  diperbarui_pada!: Date;
}
// <--- end --->