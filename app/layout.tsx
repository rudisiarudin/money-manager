// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Money Manager',
  description: 'A modern money tracking app for personal finance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
