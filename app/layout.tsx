import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import ClientProvider from "@/hoc/ClientProvider";
import { Toaster } from "sonner";

const fonts = Roboto({
  weight: ["100", "300", "400", "500", "700", "900"],
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "IPCE - Building Management System",
  description: "modus operandi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fonts.className} antialiased`}>
          <ClientProvider>{children}
            <Toaster />
          </ClientProvider>
      </body>
    </html>
  );
}
