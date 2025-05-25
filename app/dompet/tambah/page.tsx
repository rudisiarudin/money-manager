'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const walletOptions = [
  { source: 'Bank BCA', icon: '/banks/bca.png' },
  { source: 'ALLO Bank', icon: '/banks/allo.png' },
  { source: 'Sea Bank', icon: '/banks/seabank.png' },
  { source: 'Jenius', icon: '/banks/jenius.png' },
  { source: 'Dompet Fisik', icon: '/banks/cash.png' },
];

const incomeCategoriesWithIcon = [
  { name: 'Gaji', icon: '💼' },
  { name: 'Penjualan', icon: '🛒' },
  { name: 'Freelance', icon: '🧑‍💻' },
  { name: 'Other', icon: '🔖' },
];

type Wallet = {
  id: string;
  source: string;
  balance: number;
  icon: string;
  userId: string;
};

export default function TambahDompetPage() {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Gaji');
  const [amount, setAmount] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [user, setUser] = useState<null | { uid: string }>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        fetchWallets(currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchWallets = async (uid: string) => {
    try {
      // Query hanya wallets milik user ini saja
      const q = query(collection(db, 'wallets'), where('userId', '==', uid));
      const snapshot = await getDocs(q);
      const data: Wallet[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          source: typeof d.source === 'string' ? d.source : 'Unknown',
          balance: typeof d.balance === 'number' ? d.balance : 0,
          icon: typeof d.icon === 'string' ? d.icon : '/banks/default.png',
          userId: typeof d.userId === 'string' ? d.userId : '',
        };
      });
      setWallets(data);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('User not authenticated');
      return;
    }
    if (!selectedSource || !amount) {
      alert('Pilih dompet dan masukkan saldo');
      return;
    }

    // Bersihkan input amount, ganti "500.000" jadi 500000
    const cleanAmount = parseInt(amount.replace(/\./g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert('Nominal tidak valid.');
      return;
    }

    const selected = walletOptions.find((opt) => opt.source === selectedSource);
    if (!selected) return;

    const now = new Date();

    // Cek apakah dompet sudah ada, untuk update balance
    const existingWallet = wallets.find((w) => w.source === selectedSource);

    try {
      if (existingWallet) {
        const newBalance = existingWallet.balance + cleanAmount;
        const walletRef = doc(db, 'wallets', existingWallet.id);
        await updateDoc(walletRef, { balance: newBalance });
      } else {
        await addDoc(collection(db, 'wallets'), {
          source: selectedSource,
          balance: cleanAmount,
          icon: selected.icon,
          createdAt: now,
          userId: user.uid,
        });
      }

      // Catat transaksi pemasukan dengan userId
      await addDoc(collection(db, 'transactions'), {
        title: `${selectedCategory} - ${selectedSource}`,
        amount: cleanAmount,
        type: 'income',
        category: selectedCategory,
        source: selectedSource,
        date: now.toISOString().split('T')[0],
        createdAt: now,
        userId: user.uid,
      });

      router.push('/dompet');
    } catch (error) {
      console.error('Error saving wallet or transaction:', error);
      alert('Terjadi kesalahan saat menyimpan data.');
    }
  };

  const formatNumber = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
        <button onClick={() => router.back()} className="flex items-center text-blue-600">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-lg font-semibold">Tambah Dompet</h1>
        <div className="w-5" />
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-4">
        {/* Pilih Dompet */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">Pilih Dompet</label>
          <div className="grid grid-cols-2 gap-4">
            {walletOptions.map((wallet) => (
              <button
                key={wallet.source}
                type="button"
                onClick={() => setSelectedSource(wallet.source)}
                className={`border p-3 rounded-xl flex items-center gap-3 ${
                  selectedSource === wallet.source ? 'border-blue-600 bg-blue-50' : ''
                }`}
              >
                <img src={wallet.icon} alt={wallet.source} className="w-8 h-8 object-contain" />
                <span className="text-sm font-medium">{wallet.source}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pilih Kategori Pemasukan */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">Kategori Pemasukan</label>
          <div className="grid grid-cols-2 gap-4">
            {incomeCategoriesWithIcon.map(({ name, icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedCategory(name)}
                className={`border p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
                  selectedCategory === name ? 'border-blue-600 bg-blue-50' : ''
                }`}
              >
                <span className="text-xl select-none">{icon}</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Saldo */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">Saldo Awal</label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatNumber(e.target.value))}
            placeholder="Contoh: 500.000"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-md"
        >
          Simpan Dompet
        </button>
      </form>
    </div>
  );
}
