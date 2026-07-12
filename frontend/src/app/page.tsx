"use client";

import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

/* <--- fitur halaman login deklarasi ---> */

type DataPenggunaLogin = {
 id: number;
 nrp: string;
 nama: string;
 email: string;
 nomor_telepon: string;
 role: "ADMIN" | "KARYAWAN";
 kode_tiket?: string;
};

type HasilLogin = {
 token: string;
 pengguna: DataPenggunaLogin;
};

export default function HalamanLogin() {
 const router = useRouter();
 const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

 const [nrp, setNrp] = useState("");
 const [kataSandi, setKataSandi] = useState("");
 const [sedangMasuk, setSedangMasuk] = useState(false);
 const [pesanError, setPesanError] = useState("");
 const [pesanBerhasil, setPesanBerhasil] = useState("");

 useEffect(() => {
 const token = localStorage.getItem("token_deklarasi");
 const dataPengguna = localStorage.getItem("pengguna_deklarasi");

 if (!token || !dataPengguna) return;

 try {
 const penggunaTersimpan: DataPenggunaLogin = JSON.parse(dataPengguna);

 if (penggunaTersimpan.role === "ADMIN") {
 router.replace("/admin");
 } else {
 router.replace("/dashboard");
 }
 } catch {
 localStorage.removeItem("token_deklarasi");
 localStorage.removeItem("pengguna_deklarasi");
 }
 }, [router]);

 const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();

 if (!nrp.trim()) {
 setPesanError("NRP wajib diisi.");
 return;
 }

 if (!kataSandi.trim()) {
 setPesanError("Kata sandi wajib diisi.");
 return;
 }

 setSedangMasuk(true);
 setPesanError("");
 setPesanBerhasil("");

 try {
 const response = await fetch(`${apiUrl}/auth/login`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 nrp: nrp.trim(),
 kata_sandi: kataSandi.trim(),
 }),
 });

 if (!response.ok) {
 const hasilError = await response.json().catch(() => null);

 throw new Error(
 hasilError?.message || "Login gagal. Periksa NRP dan kata sandi."
 );
 }

 const hasil: HasilLogin = await response.json();

 if (!hasil.token || !hasil.pengguna) {
 throw new Error("Token atau data pengguna tidak ditemukan");
 }

 localStorage.setItem("token_deklarasi", hasil.token);
 localStorage.setItem("pengguna_deklarasi", JSON.stringify(hasil.pengguna));

 setPesanBerhasil(`Login berhasil. Selamat datang, ${hasil.pengguna.nama}`);

 setTimeout(() => {
 if (hasil.pengguna.role === "ADMIN") {
 router.push("/admin");
 } else {
 router.push("/dashboard");
 }
 }, 700);
 } catch (error) {
 setPesanError(
 error instanceof Error ? error.message : "Terjadi kesalahan login"
 );
 } finally {
 setSedangMasuk(false);
 }
 };

 return (
 <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-50 px-4 py-10">
 <section className="w-full max-w-md">
 <div className="rounded-[32px] border border-red-100 bg-white p-8 shadow-[0_24px_80px_rgba(220,38,38,0.18)]">
 <div className="mb-8 text-center">
 <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-600 text-white shadow-lg shadow-red-200">
 <ShieldCheck className="h-8 w-8" />
 </div>

 <h1 className="text-2xl font-bold text-slate-900">
 Sistem Deklarasi Dinas
 </h1>

 <p className="mt-2 text-sm leading-6 text-slate-500">
 Login menggunakan NRP dan kata sandi untuk masuk ke sistem
 deklarasi perjalanan dinas / uang operasional.
 </p>
 </div>

 <form onSubmit={handleLogin} className="space-y-5">
 <div>
 <label
 htmlFor="nrp"
 className="mb-2 block text-sm font-semibold text-slate-700"
 >
 NRP / Username
 </label>
 <input
 id="nrp"
 name="nrp"
 type="text"
 value={nrp}
 onChange={(event) => setNrp(event.target.value)}
 placeholder="Contoh: 250013 / admin"
 className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
 />
 </div>

 <div>
 <label
 htmlFor="kataSandi"
 className="mb-2 block text-sm font-semibold text-slate-700"
 >
 Kata Sandi
 </label>
 <input
 id="kataSandi"
 name="kataSandi"
 type="password"
 value={kataSandi}
 onChange={(event) => setKataSandi(event.target.value)}
 placeholder="Masukkan kata sandi"
 className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
 />
 </div>

 {pesanError && (
 <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
 {pesanError}
 </div>
 )}

 {pesanBerhasil && (
 <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
 {pesanBerhasil}
 </div>
 )}

 <button
 type="submit"
 disabled={sedangMasuk}
 className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
 >
 {sedangMasuk ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 Memproses Login...
 </>
 ) : (
 <>
 <LogIn className="h-4 w-4" />
 Masuk
 </>
 )}
 </button>
 </form>
 </div>
 </section>
 </main>
 );
}

/* <--- end ---> */