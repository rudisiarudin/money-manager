'use client';

import { useEffect, useState } from 'react';
import {
  Home,
  Clock,
  Plus,
  User,
  DollarSign,
  Eye,
  EyeOff,
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// Format Rupiah
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Greeting & message sesuai waktu
function getGreetingAndMessage() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) {
    return { greeting: 'Selamat Pagi', icon: <Sun size={20} />, message: 'Semoga harimu penuh semangat!' };
  } else if (hour >= 10 && hour < 15) {
    return { greeting: 'Selamat Siang', icon: <CloudSun size={20} />, message: 'Tetap semangat dan produktif!' };
  } else if (hour >= 15 && hour < 18) {
    return { greeting: 'Selamat Sore', icon: <CloudMoon size={20} />, message: 'Jangan lupa istirahat ya!' };
  }
  return { greeting: 'Selamat Malam', icon: <Moon size={20} />, message: 'Semoga mimpimu indah!' };
}

const icons: Record<string, string> = {
  Gaji: '💼',
  Penjualan: '🛒',
  Freelance: '🧑‍💻',
  Other: '🔖',
  Food: '🍔',
  Transport: '🚌',
  Shopping: '🛍️',
  Entertainment: '🎮',
  Health: '💊',
  Education: '📚',
  Bills: '💡',
  Travel: '✈️',
  Others: '📦',
};

type Transaction = {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  source: string;
};

export default function HomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeTx: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      const fullName = user.displayName || user.email?.split('@')[0] || 'User';
      const firstName = fullName.split(' ')[0];
      setUserName(firstName);

      const txQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid)
      );
      unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
        const txData: Transaction[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Transaction, 'id'>),
        }));
        setTransactions(txData);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTx) unsubscribeTx();
    };
  }, [router]);

  useEffect(() => {
    if (transactions.length > 0) {
      const totalIncome = transactions
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalExpense = transactions
        .filter((tx) => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

      setIncome(totalIncome);
      setExpense(totalExpense);
    }
  }, [transactions]);

  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const expenseToday = transactions
    .filter((tx) => tx.type === 'expense' && tx.date.startsWith(today))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expenseYesterday = transactions
    .filter((tx) => tx.type === 'expense' && tx.date.startsWith(yesterday))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const { greeting, icon, message } = getGreetingAndMessage();

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col pb-20 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Header */}
      <header className="pt-6 flex items-center gap-3">
        <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
        <h1 className="text-2xl font-extrabold">
          <span className="text-[#122d5b]">Artos</span>
          <span className="text-[#f4a923]">Ku</span>
        </h1>
      </header>

      {/* Greeting */}
      <section className="mt-2 flex items-center gap-2">
        <div className="text-[#122d5b] text-lg flex items-center gap-1 font-semibold">
          {icon} {greeting}, <span className="font-bold">{userName}!</span>
        </div>
      </section>
      <p className="text-sm text-gray-600 font-medium mb-3">{message}</p>

      {/* Balance Card */}
      <section>
        <div className="bg-gradient-to-br from-[#122d5b] to-[#13223c] text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-4 top-4 text-white opacity-60">
            <button onClick={() => setShowBalance(!showBalance)} aria-label="Toggle saldo">
              {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <div className="mb-6">
            <p className="text-xs opacity-80">Total Saldo</p>
            <h1 className="text-2xl font-bold mt-1">
              {showBalance ? formatCurrency(income - expense) : '••••••'}
            </h1>
          </div>
          <div className="flex justify-between text-xs opacity-70">
            <div className="text-green-400">
              <p className="uppercase font-semibold">Pemasukan</p>
              <p>{formatCurrency(income)}</p>
            </div>
            <div className="border-l border-white/40" />
            <div className="text-red-400">
              <p className="uppercase font-semibold">Pengeluaran</p>
              <p>{formatCurrency(expense)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ringkasan Pengeluaran Hari Ini & Kemarin */}
      <section className="mt-4 bg-white rounded-xl p-4 shadow-sm flex justify-around text-center text-[#122d5b]">
        <div>
          <p className="text-xs text-gray-500">Pengeluaran Hari Ini</p>
          <p className="font-semibold text-lg">{formatCurrency(expenseToday)}</p>
        </div>
        <div className="border-l border-gray-300" />
        <div>
          <p className="text-xs text-gray-500">Pengeluaran Kemarin</p>
          <p className="font-semibold text-lg">{formatCurrency(expenseYesterday)}</p>
        </div>
      </section>

      {/* Alert Pengeluaran Hari Ini */}
      <section className="mt-3">
        {expenseToday > 100000 ? (
          <div className="bg-red-100 text-red-700 rounded-md p-3 text-center font-semibold">
            ⚠️ Boros! Pengeluaranmu hari ini cukup besar.
          </div>
        ) : expenseToday > 30000 ? (
          <div className="bg-yellow-100 text-yellow-700 rounded-md p-3 text-center font-semibold">
            💡 Berhemat ya, jangan boros.
          </div>
        ) : (
          <div className="bg-green-100 text-green-700 rounded-md p-3 text-center font-semibold">
            🎉 Hemat banget, lanjutkan terus!
          </div>
        )}
      </section>

      {/* Recent Transactions Header */}
      <section className="mt-5 flex justify-between items-center mb-2">
        <h3 className="font-semibold text-[#122d5b]">Transaksi Terbaru</h3>
        <Link href="/history" className="text-sm text-[#122d5b] font-medium hover:underline">
          Lihat Semua
        </Link>
      </section>

      {/* Recent Transactions List */}
      <section className="flex flex-col gap-2 max-h-60 overflow-auto">
        {sortedTransactions.slice(0, 5).map((tx) => (
          <div
            key={tx.id}
            className="flex justify-between items-center p-3 rounded-lg bg-white shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{icons[tx.category] || '📦'}</div>
              <div>
                <p className="font-semibold text-[#122d5b]">{tx.title}</p>
                <p className="text-xs text-gray-400">{tx.date}</p>
              </div>
            </div>
            <div className={tx.type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
            </div>
          </div>
        ))}
      </section>

      {/* Bottom Navbar with center plus button */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center h-16 px-6 shadow-inner">
        <Link href="/" className="text-[#122d5b] hover:text-[#0f234e] transition">
          <Home size={26} />
        </Link>
        <Link href="/history" className="text-[#122d5b] hover:text-[#0f234e] transition">
          <Clock size={26} />
        </Link>

        {/* Add transaction button center */}
        <button
          onClick={() => router.push('/tambah')}
          aria-label="Tambah Transaksi"
          className="bg-[#122d5b] hover:bg-[#0f234e] text-white rounded-full p-3 flex items-center justify-center shadow-lg -mt-10"
          style={{ width: 56, height: 56 }}
        >
          <Plus size={32} />
        </button>

        <Link href="/dompet" className="text-[#122d5b] hover:text-[#0f234e] transition">
          <DollarSign size={26} />
        </Link>
        <Link href="/profile" className="text-[#122d5b] hover:text-[#0f234e] transition">
          <User size={26} />
        </Link>
      </nav>
    </div>
  );
}
