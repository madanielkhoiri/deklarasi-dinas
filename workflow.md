# Analisa Database dan Workflow Aplikasi Deklarasi Dinas

Aplikasi ini adalah sistem manajemen **Perjalanan Dinas** dan **Uang Operasional** yang dibangun menggunakan **NestJS**, **TypeORM**, **MySQL**, dan **Google Cloud Vision (OCR)**. Aplikasi ini memfasilitasi proses dari awal pengajuan dana, pentransferan, deklarasi pengeluaran dengan bukti nota yang diekstrak menggunakan OCR, hingga pengembalian sisa dana (settlement).

## 1. Analisa Database (Entitas Utama)

Sistem database terdiri dari beberapa tabel (entitas) yang saling berelasi:

### A. Pengguna (`pengguna`)
- Menyimpan data akun aplikasi.
- Memiliki 3 tipe role: `SUPER_ADMIN`, `FA` (Finance Admin), dan `KARYAWAN`.
- **Kolom Tabel:**
  - `id` (PK)
  - `nrp` (string, unique)
  - `nama` (string)
  - `email` (string, unique, nullable)
  - `nomor_telepon` (string, nullable)
  - `kata_sandi` (string)
  - `role` (enum: SUPER_ADMIN, FA, KARYAWAN)
  - `aktif` (boolean)
  - `kode_tiket` (string, nullable)
  - `dibuat_pada`, `diperbarui_pada` (timestamps)

### B. Pengajuan (`pengajuan`)
- Menyimpan data pengajuan dana awal oleh Karyawan.
- Karyawan mengunggah dokumen referensi: **STD** (Surat Tugas Dinas) dan **RAB** (Rencana Anggaran Biaya).
- **Kolom Tabel:**
  - `id` (PK)
  - `id_pengguna`, `nrp`, `nama_pengguna` (relasi user)
  - `jenis_pengajuan` (enum: PERJALANAN_DINAS, UANG_OPERASIONAL)
  - `lokasi`, `keterangan`, `nomor_std`, `nomor_rab` (nullable)
  - `nama_file_std`, `path_file_std` (nullable)
  - `nama_file_rab`, `path_file_rab`
  - `nominal_transfer` (decimal)
  - `nama_file_bukti_transfer`, `path_file_bukti_transfer`, `tanggal_transfer` (diisi oleh FA, nullable)
  - `id_saldo` (terhubung ke saldo jika disetujui, nullable)
  - `status_pengajuan` (enum: DIAJUKAN, DISETUJUI, DITOLAK, MENUNGGU_TRANSFER, SELESAI)
  - `catatan_admin` (nullable)
  - `tanggal_pengajuan` (date)
  - `dibuat_pada`, `diperbarui_pada` (timestamps)

### C. Saldo (`saldo`)
- Dibuat/diperbarui setelah dana Pengajuan ditransfer.
- Mencatat total dana yang diterima (dari pengajuan), total yang digunakan (dari deklarasi), sisa saldo, dan riwayat pengembalian.
- Menangani proses unggah **Bukti Pengembalian** jika terdapat `ADA_SISA` dana.
- **Kolom Tabel:**
  - `id` (PK)
  - `id_pengguna`, `nrp`, `nama_pengguna` (relasi user)
  - `lokasi`, `keterangan`, `nomor_std` (nullable)
  - `jenis_saldo` (enum: PERJALANAN_DINAS, UANG_OPERASIONAL)
  - `nominal_transfer`, `total_penggunaan`, `sisa_saldo`, `nominal_pengembalian` (decimal)
  - `tanggal_transfer` (date)
  - `status_saldo` (enum: AKTIF, PAS, ADA_SISA, MELEBIHI_NOMINAL, MENUNGGU_PENGEMBALIAN, SELESAI)
  - `nama_file_bukti_pengembalian`, `path_file_bukti_pengembalian` (nullable)
  - `status_bukti_pengembalian` (enum: BELUM_UPLOAD, DIAJUKAN, DISETUJUI, DITOLAK)
  - `alasan_bukti_pengembalian_ditolak` (nullable)
  - `tanggal_upload_bukti_pengembalian`, `tanggal_verifikasi_pengembalian` (datetime, nullable)
  - `dibuat_pada`, `diperbarui_pada` (timestamps)

### D. Deklarasi (`deklarasi`)
- Dibuat oleh Karyawan untuk melaporkan rincian pengeluaran (pertanggungjawaban dana).
- Mengakumulasi total nominal dari semua nota yang dilampirkan.
- **Kolom Tabel:**
  - `id` (PK)
  - `kode_deklarasi` (string, unique)
  - `id_pengguna`, `nrp`, `nama_pengguna` (relasi user)
  - `id_saldo` (nullable, terikat ke entitas Saldo)
  - `jenis_deklarasi` (enum: PERJALANAN_DINAS, UANG_OPERASIONAL)
  - `tanggal_kegiatan` (date)
  - `lokasi`, `keterangan` (string/text)
  - `nomor_std` (nullable)
  - `total_nominal` (decimal)
  - `status` (enum: DRAFT, DIAJUKAN, DIVERIFIKASI, DISETUJUI, DITOLAK)
  - `dibuat_pada`, `diperbarui_pada` (timestamps)

### E. Nota (`nota`)
- Rincian struk/kuitansi pengeluaran yang diunggah ke dalam sebuah Deklarasi.
- **Fitur OCR:** Diekstrak otomatis menggunakan Google Cloud Vision saat gambar diunggah.
- **Kolom Tabel:**
  - `id` (PK)
  - `id_deklarasi` (relasi ke Deklarasi)
  - `kategori_nota` (enum kategori: MAKAN, AKOMODASI, TRANSPORTASI, LAUNDRY, dan DANA_OPERASIONAL_*)
  - `barang_jasa`, `pic_settlement`, `keterangan_settlement` (nullable)
  - `jumlah_item_settlement` (int)
  - `nama_file`, `path_file` (string)
  - `hasil_ocr_text` (text, nullable)
  - `nominal_ocr`, `nominal_final` (decimal)
  - `apakah_dikoreksi` (boolean)
  - `alasan_koreksi` (text, nullable)
  - `status_verifikasi` (enum: BELUM_OCR, OCR_SELESAI, DIVERIFIKASI, DITOLAK)
  - `dibuat_pada`, `diperbarui_pada` (timestamps)

### F. Database Settlement (`database_settlement`)
- Menyimpan data akhir (settlement) yang lebih mendetail per item barang/jasa.
- Umumnya diekspor atau digunakan oleh departemen HCGA atau Finance untuk pencatatan *cost center*, harga per QTY, dan kode settlement akhir.
- **Kolom Tabel:**
  - `id` (PK)
  - `id_deklarasi`, `id_saldo`, `id_pengguna` (relasi ID)
  - `kode_jangan_diubah`, `nomor_settlement`, `item`, `item_sett` (string/int)
  - `department` (default: 'HCGA')
  - `tanggal_pembuatan`, `tanggal_per_item` (date)
  - `nama_barang_jasa` (string)
  - `qty`, `harga_per_qty`, `total` (decimal)
  - `keterangan` (text, nullable)
  - `cost_center` (default: 'HCGA')
  - `nomor_rab_pb`, `pic` (nullable)
  - `status_data` (enum: AKTIF, DIBATALKAN)
  - `dibuat_pada`, `diperbarui_pada` (timestamps)

---

## 2. Alur Kerja Aplikasi (Workflow)

Secara garis besar, siklus aplikasi berjalan dalam 4 tahap utama:

### Tahap 1: Pengajuan Dana (Request)
1. **Karyawan** membuat `Pengajuan` (Perjalanan Dinas / Uang Operasional).
2. Karyawan wajib melampirkan file STD dan RAB, lalu melakukan _Submit_ (status: `DIAJUKAN`).
3. **FA** memeriksa Pengajuan tersebut. Jika valid, status diubah menjadi `DISETUJUI` dan lalu `MENUNGGU_TRANSFER`.
4. **FA** mentransfer dana ke rekening Karyawan, mengisi nominal aktual, mengunggah bukti transfer, dan menyelesaikan pengajuan (status: `SELESAI`).

### Tahap 2: Pembentukan Saldo (Balance)
1. Saat Pengajuan selesai (dana ditransfer), sistem akan membuat/menambahkan _record_ `Saldo` aktif untuk Karyawan tersebut.
2. Saldo ini menjadi dompet virtual yang melacak berapa dana operasional/dinas yang bisa dideklarasikan oleh karyawan.

### Tahap 3: Deklarasi Pengeluaran (Declaration & OCR)
1. Setelah kegiatan selesai, **Karyawan** membuat `Deklarasi` (status: `DRAFT`) yang memotong dari Saldo aktifnya.
2. Karyawan menambahkan `Nota` satu per satu. Setiap nota yang diunggah akan diproses oleh **OCR (Google Cloud Vision)** untuk mendeteksi teks kuitansi dan mengekstrak nilai nominalnya (`OCR_SELESAI`).
3. Karyawan mengecek kembali kebenaran nota, lalu mengajukan deklarasi keseluruhan (status: `DIAJUKAN`).
4. **FA** melakukan verifikasi atas deklarasi dan nota-nota di dalamnya. FA bisa mengoreksi nilai nominal jika pembacaan OCR keliru.
5. Jika sudah sesuai, FA menyetujui deklarasi (status: `DISETUJUI`). `Total Penggunaan` di entitas Saldo akan otomatis terupdate.

### Tahap 4: Settlement & Pengembalian Dana (Refund)
1. Sistem akan menghitung: `Nominal Transfer (Awal)` dikurangi `Total Penggunaan (Deklarasi)`.
   - Jika **Sisa Saldo = 0**, status saldo menjadi `PAS`.
   - Jika **Sisa Saldo > 0**, status saldo menjadi `ADA_SISA`.
2. Jika ada sisa, **Karyawan** wajib mentransfer balik sisa dana ke perusahaan dan mengunggah **Bukti Pengembalian** di menu Saldo.
3. Status berubah menjadi `MENUNGGU_PENGEMBALIAN`.
4. **FA** memverifikasi bukti pengembalian. Jika uang sudah masuk, FA melakukan validasi dan siklus berakhir (status saldo: `SELESAI`).
5. (Opsional) Sistem meng-generate data `Database Settlement` terperinci per-item untuk kebutuhan pelaporan atau integrasi dengan SAP/ERP perusahaan.
