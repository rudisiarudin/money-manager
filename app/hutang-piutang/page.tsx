'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TargetFinansialPage() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-50 via-white to-indigo-50 flex flex-col">
      {/* Header dengan background putih dan shadow */}
      <header className="bg-white shadow-md px-4 py-3 flex items-center gap-4">
        <Link
          href="/"
          className="p-2 rounded-md hover:bg-gray-100 text-indigo-700 hover:text-indigo-900 transition flex items-center"
          aria-label="Kembali"
        >
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-lg font-semibold text-gray-800 select-none font-montserrat">
          Hutang Piutang
        </h1>
      </header>

      {/* Konten utama */}
      <main className="flex flex-col items-center justify-center flex-grow px-4 py-8">
        <p className="text-indigo-600 mb-10 text-lg font-montserrat text-center">
          Fitur ini akan segera hadir 🚀
        </p>

        <div
          className="text-9xl select-none relative w-32 h-32 flex items-center justify-center"
          style={{
            animation: 'floatUpDown 3s ease-in-out infinite',
            userSelect: 'none',
          }}
          aria-hidden="true"
        >
          🎯
        </div>
      </main>

      {/* Animasi floatUpDown di root */}
      <style jsx>{`
        @keyframes floatUpDown {
          0%,
          100% {
            transform: translateY(0);
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
          }
          50% {
            transform: translateY(-15%);
            filter: drop-shadow(0 8px 15px rgba(0, 0, 0, 0.15));
          }
        }
      `}</style>

      {/* Import font Montserrat global */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');
        body {
          font-family: 'Montserrat', sans-serif;
        }
      `}</style>
    </div>
  );
}
