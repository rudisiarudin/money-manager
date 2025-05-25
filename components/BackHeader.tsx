'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BackHeaderProps {
  title: string;
  href?: string;
}

export default function BackHeader({ title, href = '/' }: BackHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
      <Link href={href} className="flex items-center text-blue-600">
        <ArrowLeft className="w-5 h-5 mr-1" />
      </Link>
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="w-5" />
    </div>
  );
}
