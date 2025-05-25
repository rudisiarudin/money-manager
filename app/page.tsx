'use client';

import { useEffect, useState } from 'react';
import {
  Eye, EyeOff, Home, Clock, PlusCircle, User, DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

type Transaction = {
  id: string;
  title: string;
  date: string; // ISO string
  amount: number;
  type: 'income' | 'expense';
  category: string;
  source: string;
};

type WalletItem = {
  id: string;
  source: string;
  balance: number;
  icon: string;
};

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
      } else {
        // Ambil nama depan user dari displayName atau email
        const fullName = user.displayName || user.email?.split('@')[0] || 'User';
        const firstName = fullName.split(' ')[0];
        setUserName(firstName);

        // Ambil transaksi user ini
        const txQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid)
        );
        const txSnapshot = await getDocs(txQuery);
        const txData: Transaction[] = txSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Transaction, 'id'>),
        }));

        // Ambil wallet user ini
        const walletQuery = query(
          collection(db, 'wallets'),
          where('userId', '==', user.uid)
        );
        const walletSnapshot = await getDocs(walletQuery);
        const walletData: WalletItem[] = walletSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<WalletItem, 'id'>),
        }));

        setTransactions(txData);
        setWallets(walletData);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        Loading...
      </div>
    );
  }

  // Hitung total pemasukan dan pengeluaran
  const expense = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const income = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Total saldo dompet
  const walletTotal = wallets.reduce(
    (sum, w) => sum + Number(w.balance || 0),
    0
  );

  // Urutkan transaksi berdasarkan tanggal terbaru
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <header className="p-4 pt-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">
          <span className="text-black">Duit</span>
          <span className="text-fuchsia-600">Ku</span>
        </h1>
        <div className="flex gap-3">
          <button className="bg-white rounded-full p-2 shadow-sm">🔔</button>
          <button className="bg-white rounded-full p-2 shadow-sm">⚙️</button>
        </div>
      </header>

      {/* Balance */}
      <section className="px-4">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-2xl p-5 shadow-md relative">
          <p className="text-sm">Welcome back</p>
          <h2 className="font-bold">{getGreeting()}, {userName}!</h2>

          <h1 className="text-3xl font-bold mt-2">
            {showBalance ? formatCurrency(walletTotal) : '••••••'}
          </h1>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="absolute top-4 right-4 text-white"
            aria-label="Toggle balance visibility"
          >
            {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>

          <p className="text-xs mt-1">TOTAL BALANCE</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-green-100 text-green-700 rounded-xl p-4 flex flex-col">
            <p>Pemasukan</p>
            <h3 className="text-xl font-semibold">{formatCurrency(income)}</h3>
          </div>
          <div className="bg-red-100 text-red-700 rounded-xl p-4 flex flex-col">
            <p>Pengeluaran</p>
            <h3 className="text-xl font-semibold">{formatCurrency(expense)}</h3>
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="px-4 mt-6 flex-1 overflow-auto">
        <h3 className="font-semibold text-gray-700 mb-3">Recent Transactions</h3>
        {sortedTransactions.length === 0 ? (
          <p className="text-sm text-gray-400">No transactions yet.</p>
        ) : (
          sortedTransactions.slice(0, 3).map((tx) => (
            <Card key={tx.id} className="mb-2">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icons[tx.category] || '📦'}</span>
                  <div>
                    <p className="font-medium">{tx.category}</p>
                    <p className="text-xs text-gray-400">{tx.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-sm flex justify-around py-2 px-4 z-10 rounded-t-xl">
        <Link href="/">
          <Home className="w-6 h-6 text-blue-600" />
        </Link>
        <Link href="/history">
          <Clock className="w-6 h-6 text-gray-500" />
        </Link>
        <Link href="/tambah">
          <div className="bg-blue-600 text-white rounded-full p-3 -mt-8 shadow-md">
            <PlusCircle className="w-6 h-6" />
          </div>
        </Link>
        <Link href="/dompet">
          <DollarSign className="w-6 h-6 text-gray-500" />
        </Link>
        <Link href="/profile">
          <User className="w-6 h-6 text-gray-500" />
        </Link>
      </nav>
    </div>
  );
}
