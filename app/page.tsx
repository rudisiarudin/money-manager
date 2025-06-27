'use client';

import { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Home,
  Clock,
  Plus,
  DollarSign,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import AdsBanner from '@/components/AdsBanner';

import TambahTransaksiModal from '@/components/TambahTransaksiModal';

// Import font Montserrat
import { Montserrat } from 'next/font/google';
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-montserrat' });

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

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

type TargetFinancial = {
  id: string;
  name: string;
  amount: number;
  targetDate: string;
};

export default function HomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [targetFinancials, setTargetFinancials] = useState<TargetFinancial[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeTx: (() => void) | null = null;
    let unsubscribeTarget: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      const fullName = user.displayName || user.email?.split('@')[0] || 'User';
      const firstName = fullName.split(' ')[0];
      setUserName(firstName);

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.dailyLimit) {
            setDailyLimit(data.dailyLimit);
          }
        }
      } catch (error) {
        console.error('Error fetching daily limit:', error);
      }

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

      const targetQuery = query(
        collection(db, 'targetFinancials'),
        where('userId', '==', user.uid)
      );
      unsubscribeTarget = onSnapshot(targetQuery, (snapshot) => {
        const targetData: TargetFinancial[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<TargetFinancial, 'id'>),
        }));
        setTargetFinancials(targetData);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTx) unsubscribeTx();
      if (unsubscribeTarget) unsubscribeTarget();
    };
  }, [router]);

  useEffect(() => {
    const totalIncome = transactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    setIncome(totalIncome);
    setExpense(totalExpense);
  }, [transactions]);

  useEffect(() => {
    const openModalHandler = () => setIsModalOpen(true);
    window.addEventListener('openTambahModal', openModalHandler);
    return () => window.removeEventListener('openTambahModal', openModalHandler);
  }, []);

  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const expenseToday = transactions
    .filter((tx) => tx.type === 'expense' && tx.date.startsWith(today))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expenseYesterday = transactions
    .filter((tx) => tx.type === 'expense' && tx.date.startsWith(yesterday))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalTarget = targetFinancials.reduce((sum, target) => sum + target.amount, 0);

  const { greeting, icon, message } = getGreetingAndMessage();

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center font-sans">Loading...</div>;
  }

  return (
    <>
      <div className={`${montserrat.className} min-h-screen bg-[#F7F9FA] flex flex-col pb-24 px-4 font-sans`}>
        {/* Header */}
        <header className="pt-6 flex items-center gap-3">
          <Image src="/logo.png" alt="Logo" width={48} height={48} />
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
          <div className="bg-gradient-to-br from-[#122d5b] to-[#13223c] text-white rounded-2xl p-5 shadow-lg">
            <p className="text-xs opacity-80">Total Saldo</p>
            <div className="flex items-center gap-2 mt-1 mb-4">
              <h1 className="text-2xl font-bold"> 💰
                {showBalance ? formatCurrency(income - expense - totalTarget) : '••••••'}
              </h1>
              <button onClick={() => setShowBalance(!showBalance)}>
                {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="flex justify-between text-xs opacity-70">
              <div className="text-green-400">
                <p className="uppercase font-semibold">📈 Pemasukan</p>
                <p>{formatCurrency(income)}</p>
              </div>
              <div className="border-l border-white/40" />
              <div className="text-red-400">
                <p className="uppercase font-semibold">📉 Pengeluaran</p>
                <p>{formatCurrency(expense)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Ringkasan Harian */}
        <section className="mt-4 bg-white rounded-xl p-4 shadow-sm flex justify-around text-center text-[#122d5b]">
          <div>
            <p className="text-xs text-gray-500">Hari Ini</p>
            <p className="font-semibold text-lg">{formatCurrency(expenseToday)}</p>
          </div>
          <div className="border-l border-gray-300" />
          <div>
            <p className="text-xs text-gray-500">Kemarin</p>
            <p className="font-semibold text-lg">{formatCurrency(expenseYesterday)}</p>
          </div>
        </section>

        {/* Alert Notifikasi Limit */}
        <section className="mt-3">
          {dailyLimit > 0 && (
            expenseToday > dailyLimit ? (
              <div className="bg-red-100 text-red-700 rounded-md p-3 text-center font-semibold">
                ⚠️ Kamu sudah melebihi limit pengeluaran harian Rp{dailyLimit.toLocaleString('id-ID')}!
              </div>
            ) : expenseToday > dailyLimit * 0.7 ? (
              <div className="bg-yellow-100 text-yellow-700 rounded-md p-3 text-center font-semibold">
                ⚠️ Pengeluaranmu sudah mendekati limit harian Rp{dailyLimit.toLocaleString('id-ID')}. Hati-hati ya!
              </div>
            ) : (
              <div className="bg-green-100 text-green-700 rounded-md p-3 text-center font-semibold">
                🎉 Pengeluaranmu masih dalam batas limit harian Rp{dailyLimit.toLocaleString('id-ID')}.
              </div>
            )
          )}
        </section>

        {/* Menu Fitur Tambahan */}
        <section className="mt-5 grid grid-cols-3 gap-4">
          <Link href="/split-bill" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2">
            <span className="text-3xl">🤝</span>
            <p className="font-semibold text-[#122d5b] text-center">Split</p>
          </Link>
          <Link href="/hutang-piutang" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2">
            <span className="text-3xl">💳</span>
            <p className="font-semibold text-[#122d5b] text-center">Hutang</p>
          </Link>
          <Link href="/target-finansial" className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2">
            <span className="text-3xl">🎯</span>
            <p className="font-semibold text-[#122d5b] text-center">Target</p>
          </Link>
        </section>

        
        {/* Iklan Google - tidak mengganggu */}
        <AdsBanner />

        {/* Transaksi Terbaru */}
        <section className="mt-5 flex justify-between items-center mb-2">
          <h3 className="font-semibold text-[#122d5b]">🧾 Transaksi Terbaru</h3>
          <Link href="/history" className="text-sm text-[#122d5b] font-medium hover:underline">
            Lihat Semua
          </Link>
        </section>

        <section className="flex flex-col gap-2 max-h-60 overflow-auto">
          {sortedTransactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex justify-between items-center bg-white rounded-xl shadow-sm px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{icons[tx.category] || '📌'}</div>
                <div>
                  <p className="font-semibold text-[#122d5b]">{tx.title}</p>
                  <p className="text-xs text-gray-400">{tx.date}</p>
                </div>
              </div>
              <p className={`font-semibold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </p>
            </div>
          ))}
          {sortedTransactions.length === 0 && (
            <p className="text-center text-gray-400 font-medium mt-4">Belum ada transaksi</p>
          )}
        </section>
        
     {/* Iklan hanya tampil saat modal TIDAK terbuka */}
        {!isModalOpen && <AdsBanner />}
        
        {/* Modal Tambah Transaksi */}
        {isModalOpen && (
          <TambahTransaksiModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        )}
      </div>

      {/* Navbar Bawah */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-3 px-2 shadow-md">
        <Link href="/" className="flex flex-col items-center text-[#122d5b] hover:text-[#244c90] transition-colors duration-200">
          <Home size={20} />
          <span className="text-xs mt-1 font-medium">Beranda</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center text-[#122d5b] hover:text-[#244c90] transition-colors duration-200">
          <Clock size={20} />
          <span className="text-xs mt-1 font-medium">Riwayat</span>
        </Link>
        <button
          onClick={() => setIsModalOpen(true)}
          aria-label="Tambah Transaksi"
          className="flex flex-col items-center text-white bg-[#122d5b] rounded-full p-3 shadow-lg -mt-6 w-14 h-14 justify-center hover:bg-[173d7e] transition-colors duration-200"
        >
          <Plus size={24} />
        </button>
        <Link href="/dompet" className="flex flex-col items-center text-[#122d5b] hover:text-[#244c90] transition-colors duration-200">
          <DollarSign size={20} />
          <span className="text-xs mt-1 font-medium">Dompet</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center text-[#122d5b] hover:text-[#244c90] transition-colors duration-200">
          <UserRound size={20} />
          <span className="text-xs mt-1 font-medium">Profil</span>
        </Link>
      </nav>
    </>
  );
}
