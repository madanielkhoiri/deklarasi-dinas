import { MigrationInterface, QueryRunner } from "typeorm";

export class InitDatabase1783998587227 implements MigrationInterface {
    name = 'InitDatabase1783998587227'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."database_settlement_status_data_enum" AS ENUM('AKTIF', 'DIBATALKAN')`);
        await queryRunner.query(`CREATE TABLE "database_settlement" ("id" SERIAL NOT NULL, "id_deklarasi" integer NOT NULL, "id_saldo" integer, "id_pengguna" integer NOT NULL, "kode_jangan_diubah" character varying(50) NOT NULL, "nomor_settlement" character varying(50) NOT NULL, "item" integer NOT NULL, "item_sett" character varying(50) NOT NULL, "department" character varying(120) NOT NULL DEFAULT 'HCGA', "tanggal_pembuatan" date NOT NULL, "tanggal_per_item" date NOT NULL, "nama_barang_jasa" character varying(255) NOT NULL, "qty" numeric(15,2) NOT NULL DEFAULT '1', "harga_per_qty" numeric(15,2) NOT NULL DEFAULT '0', "total" numeric(15,2) NOT NULL DEFAULT '0', "keterangan" text, "cost_center" character varying(120) NOT NULL DEFAULT 'HCGA', "nomor_rab_pb" character varying(160), "pic" character varying(150), "status_data" "public"."database_settlement_status_data_enum" NOT NULL DEFAULT 'AKTIF', "dibuat_pada" TIMESTAMP NOT NULL DEFAULT now(), "diperbarui_pada" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b45d9caa985dfea4ed8203c78ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_395a2bbd21a3517572fe2355b8" ON "database_settlement"  ("id_deklarasi", "item") `);
        await queryRunner.query(`CREATE TYPE "public"."deklarasi_jenis_deklarasi_enum" AS ENUM('PERJALANAN_DINAS', 'UANG_OPERASIONAL')`);
        await queryRunner.query(`CREATE TYPE "public"."deklarasi_status_enum" AS ENUM('DRAFT', 'DIAJUKAN', 'DIVERIFIKASI', 'DISETUJUI', 'DITOLAK')`);
        await queryRunner.query(`CREATE TABLE "deklarasi" ("id" SERIAL NOT NULL, "kode_deklarasi" character varying(80) NOT NULL, "id_pengguna" integer NOT NULL, "id_saldo" integer, "nrp" character varying(50) NOT NULL, "nama_pengguna" character varying(120) NOT NULL, "jenis_deklarasi" "public"."deklarasi_jenis_deklarasi_enum" NOT NULL, "tanggal_kegiatan" date NOT NULL, "lokasi" character varying(150) NOT NULL, "keterangan" text NOT NULL, "nomor_std" character varying(120), "total_nominal" numeric(15,2) NOT NULL DEFAULT '0', "status" "public"."deklarasi_status_enum" NOT NULL DEFAULT 'DRAFT', "dibuat_pada" TIMESTAMP NOT NULL DEFAULT now(), "diperbarui_pada" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6cf96d1f3bbcf603aeec3208574" UNIQUE ("kode_deklarasi"), CONSTRAINT "PK_806f916c9e003a0dfd6bcf8fc3e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."nota_kategori_nota_enum" AS ENUM('MAKAN', 'AKOMODASI', 'TRANSPORTASI', 'LAUNDRY', 'DANA_OPERASIONAL_W1', 'DANA_OPERASIONAL_W2', 'DANA_OPERASIONAL_BOD', 'DANA_OPERASIONAL_BYD', 'DANA_OPERASIONAL_KHUSUS')`);
        await queryRunner.query(`CREATE TYPE "public"."nota_status_verifikasi_enum" AS ENUM('BELUM_OCR', 'OCR_SELESAI', 'DIVERIFIKASI', 'DITOLAK')`);
        await queryRunner.query(`CREATE TABLE "nota" ("id" SERIAL NOT NULL, "id_deklarasi" integer NOT NULL, "kategori_nota" "public"."nota_kategori_nota_enum", "barang_jasa" character varying(255), "pic_settlement" character varying(150), "keterangan_settlement" text, "jumlah_item_settlement" integer NOT NULL DEFAULT '1', "nama_file" character varying(180) NOT NULL, "path_file" character varying(255) NOT NULL, "hasil_ocr_text" text, "nominal_ocr" numeric(15,2) NOT NULL DEFAULT '0', "nominal_final" numeric(15,2) NOT NULL DEFAULT '0', "apakah_dikoreksi" boolean NOT NULL DEFAULT false, "alasan_koreksi" text, "status_verifikasi" "public"."nota_status_verifikasi_enum" NOT NULL DEFAULT 'BELUM_OCR', "dibuat_pada" TIMESTAMP NOT NULL DEFAULT now(), "diperbarui_pada" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b416af9c0ccf8deed7b568b5ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."pengajuan_jenis_pengajuan_enum" AS ENUM('PERJALANAN_DINAS', 'UANG_OPERASIONAL')`);
        await queryRunner.query(`CREATE TYPE "public"."pengajuan_status_pengajuan_enum" AS ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'MENUNGGU_TRANSFER', 'SELESAI')`);
        await queryRunner.query(`CREATE TABLE "pengajuan" ("id" SERIAL NOT NULL, "id_pengguna" integer NOT NULL, "nrp" character varying(50) NOT NULL, "nama_pengguna" character varying(150) NOT NULL, "jenis_pengajuan" "public"."pengajuan_jenis_pengajuan_enum" NOT NULL DEFAULT 'PERJALANAN_DINAS', "lokasi" character varying(120), "keterangan" text, "nomor_std" character varying(120), "nomor_rab" character varying(120), "nama_file_std" character varying(255), "path_file_std" character varying(255), "nama_file_rab" character varying(255) NOT NULL, "path_file_rab" character varying(255) NOT NULL, "nominal_transfer" numeric(15,2) NOT NULL DEFAULT '0', "nama_file_bukti_transfer" character varying(255), "path_file_bukti_transfer" character varying(255), "tanggal_transfer" date, "id_saldo" integer, "status_pengajuan" "public"."pengajuan_status_pengajuan_enum" NOT NULL DEFAULT 'DIAJUKAN', "catatan_admin" text, "tanggal_pengajuan" date NOT NULL, "dibuat_pada" TIMESTAMP NOT NULL DEFAULT now(), "diperbarui_pada" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d4bf579d67a089bcc11bf263e21" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."pengguna_role_enum" AS ENUM('SUPER_ADMIN', 'FA', 'KARYAWAN')`);
        await queryRunner.query(`CREATE TABLE "pengguna" ("id" SERIAL NOT NULL, "nrp" character varying(50) NOT NULL, "nama" character varying(150) NOT NULL, "email" character varying(150), "nomor_telepon" character varying(30), "kata_sandi" character varying(255) NOT NULL, "role" "public"."pengguna_role_enum" NOT NULL DEFAULT 'KARYAWAN', "aktif" boolean NOT NULL DEFAULT true, "kode_tiket" character varying(80), "dibuat_pada" TIMESTAMP NOT NULL DEFAULT now(), "diperbarui_pada" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fcbda34a80de1d93d33b00bfca0" UNIQUE ("nrp"), CONSTRAINT "UQ_e2c44474b171bd878e3d8ec22b1" UNIQUE ("email"), CONSTRAINT "PK_ca7a763029c477efd74c6ec7312" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."saldo_jenis_saldo_enum" AS ENUM('PERJALANAN_DINAS', 'UANG_OPERASIONAL')`);
        await queryRunner.query(`CREATE TYPE "public"."saldo_status_saldo_enum" AS ENUM('AKTIF', 'PAS', 'ADA_SISA', 'MELEBIHI_NOMINAL', 'MENUNGGU_PENGEMBALIAN', 'SELESAI')`);
        await queryRunner.query(`CREATE TYPE "public"."saldo_status_bukti_pengembalian_enum" AS ENUM('BELUM_UPLOAD', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK')`);
        await queryRunner.query(`CREATE TABLE "saldo" ("id" SERIAL NOT NULL, "id_pengguna" integer NOT NULL, "nrp" character varying NOT NULL, "nama_pengguna" character varying NOT NULL, "lokasi" character varying(120), "jenis_saldo" "public"."saldo_jenis_saldo_enum" NOT NULL, "nominal_transfer" numeric(15,2) NOT NULL DEFAULT '0', "total_penggunaan" numeric(15,2) NOT NULL DEFAULT '0', "sisa_saldo" numeric(15,2) NOT NULL DEFAULT '0', "nominal_pengembalian" numeric(15,2) NOT NULL DEFAULT '0', "tanggal_transfer" date NOT NULL, "keterangan" text, "nomor_std" character varying(120), "status_saldo" "public"."saldo_status_saldo_enum" NOT NULL DEFAULT 'AKTIF', "nama_file_bukti_pengembalian" character varying(255), "path_file_bukti_pengembalian" character varying(255), "status_bukti_pengembalian" "public"."saldo_status_bukti_pengembalian_enum" NOT NULL DEFAULT 'BELUM_UPLOAD', "alasan_bukti_pengembalian_ditolak" text, "tanggal_upload_bukti_pengembalian" TIMESTAMP, "tanggal_verifikasi_pengembalian" TIMESTAMP, "dibuat_pada" TIMESTAMP NOT NULL DEFAULT now(), "diperbarui_pada" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_98eaf5a198347be264b55a37133" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "saldo"`);
        await queryRunner.query(`DROP TYPE "public"."saldo_status_bukti_pengembalian_enum"`);
        await queryRunner.query(`DROP TYPE "public"."saldo_status_saldo_enum"`);
        await queryRunner.query(`DROP TYPE "public"."saldo_jenis_saldo_enum"`);
        await queryRunner.query(`DROP TABLE "pengguna"`);
        await queryRunner.query(`DROP TYPE "public"."pengguna_role_enum"`);
        await queryRunner.query(`DROP TABLE "pengajuan"`);
        await queryRunner.query(`DROP TYPE "public"."pengajuan_status_pengajuan_enum"`);
        await queryRunner.query(`DROP TYPE "public"."pengajuan_jenis_pengajuan_enum"`);
        await queryRunner.query(`DROP TABLE "nota"`);
        await queryRunner.query(`DROP TYPE "public"."nota_status_verifikasi_enum"`);
        await queryRunner.query(`DROP TYPE "public"."nota_kategori_nota_enum"`);
        await queryRunner.query(`DROP TABLE "deklarasi"`);
        await queryRunner.query(`DROP TYPE "public"."deklarasi_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."deklarasi_jenis_deklarasi_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_395a2bbd21a3517572fe2355b8"`);
        await queryRunner.query(`DROP TABLE "database_settlement"`);
        await queryRunner.query(`DROP TYPE "public"."database_settlement_status_data_enum"`);
    }

}
