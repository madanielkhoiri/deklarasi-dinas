import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


/* <--- fitur metadata aplikasi ---> */
export const metadata: Metadata = {
 title: "Sistem Deklarasi Dinas",
 description: "Aplikasi deklarasi perjalanan dinas dan uang operasional",
};
/* <--- end ---> */

/* <--- fitur layout utama aplikasi ---> */
export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="id" className={cn("font-sans", geist.variable)}>
 <body>{children}</body>
 </html>
 );
}
/* <--- end ---> */