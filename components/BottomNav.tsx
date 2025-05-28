'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, Plus, UserRound, DollarSign } from 'lucide-react';

type ButtomNavProps = {
  onTambahClick: () => void;
};

const navItems = [
  { href: '/', icon: Home },
  { href: '/history', icon: Clock },
  { href: '/dompet', icon: DollarSign },
  { href: '/profile', icon: UserRound },
];

export default function ButtomNav({ onTambahClick }: ButtomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-6 h-16 shadow-inner z-50">
      {navItems.slice(0, 2).map(({ href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`transition ${pathname === href ? 'text-blue-700' : 'text-[#122d5b] hover:text-[#0f234e]'}`}
        >
          <Icon size={26} />
        </Link>
      ))}

      {/* Tombol Tengah */}
      <button
        onClick={onTambahClick}
        aria-label="Tambah Transaksi"
        className="bg-[#122d5b] hover:bg-[#0f234e] text-white rounded-full p-4 flex items-center justify-center shadow-md -mt-10"
        style={{ width: 56, height: 56 }}
      >
        <Plus size={28} />
      </button>

      {navItems.slice(2).map(({ href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`transition ${pathname === href ? 'text-blue-700' : 'text-[#122d5b] hover:text-[#0f234e]'}`}
        >
          <Icon size={26} />
        </Link>
      ))}
    </nav>
  );
}
