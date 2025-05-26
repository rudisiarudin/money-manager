'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import BackHeader from '@/components/BackHeader';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

type WalletItem = {
  id: string;
  name: string;
  balance: number;
  type: 'bank' | 'cash';
  icon: string;
  sourceName?: string; // contoh: Bank BCA, SeaBank, Dompet Fisik
};

type CategoryItem = {
  name: string;
  icon: string;
};

const categoryOptions: CategoryItem[] = [
  { name: 'Makanan', icon: '🍔' },
  { name: 'Transportasi', icon: '🚗' },
  { name: 'Belanja', icon: '🛍️' },
  { name: 'Kesehatan', icon: '💊' },
  { name: 'Tagihan', icon: '💡' },
  { name: 'Hiburan', icon: '🎮' },
  { name: 'Hutang', icon: '📉' }, // kategori Hutang baru
  { name: 'Lainnya', icon: '📝' },
];

export default function TambahTransaksiPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setWallets([]);
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const fetchWallets = async () => {
      const walletsQuery = query(
        collection(db, 'wallets'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(walletsQuery);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WalletItem[];
      setWallets(data);
    };

    fetchWallets();
  }, [userId]);

  const handleSubmit = async () => {
    if (!title || !amount || !selectedCategory || !selectedWalletId) {
      toast.error('Harap lengkapi semua kolom');
      return;
    }

    const parsedAmount = parseInt(amount.replace(/\./g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Nominal tidak valid');
      return;
    }

    const wallet = wallets.find((w) => w.id === selectedWalletId);
    if (!wallet) {
      toast.error('Dompet tidak ditemukan');
      return;
    }

    if (wallet.balance < parsedAmount) {
      toast.error('Saldo dompet tidak mencukupi');
      return;
    }

    try {
      await addDoc(collection(db, 'transactions'), {
        title,
        amount: parsedAmount,
        type: 'expense',
        category: selectedCategory.name,
        icon: selectedCategory.icon,
        date: new Date().toISOString(),
        source: wallet.id,
        createdAt: serverTimestamp(),
        userId,
      });

      const walletRef = doc(db, 'wallets', wallet.id);
      await updateDoc(walletRef, {
        balance: wallet.balance - parsedAmount,
      });

      toast.success('Transaksi berhasil ditambahkan');
      router.push('/');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menambahkan transaksi');
    }
  };

  const formatCurrency = (value: string) => {
    const number = parseInt(value.replace(/\D/g, ''));
    if (isNaN(number)) return '';
    return number.toLocaleString('id-ID');
  };

  return (
    <div className="min-h-screen bg-white">
      <BackHeader title="Tambah Transaksi" href="/" />

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Judul</label>
          <input
            type="text"
            className="w-full border rounded-md px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Beli makan siang"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Kategori</label>
          <div className="grid grid-cols-4 gap-3">
            {categoryOptions.map((cat) => (
              <button
                type="button"
                key={cat.name}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  'border rounded-lg p-3 flex flex-col items-center text-sm transition',
                  selectedCategory?.name === cat.name
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-blue-300'
                )}
              >
                <div className="text-2xl">{cat.icon}</div>
                <span className="mt-1">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nominal</label>
          <input
            type="text"
            inputMode="numeric"
            className="w-full border rounded-md px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(formatCurrency(e.target.value))}
            placeholder="Contoh: 50.000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Sumber Dana</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={selectedWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
          >
            <option value="">-- Pilih Sumber Dana --</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name} - {w.type === 'bank' ? 'Bank' : 'Dompet'} (Saldo: Rp{Number(w.balance).toLocaleString('id-ID')})
              </option>
            ))}
          </select>
        </div>

        <Button className="w-full bg-blue-600 text-white" onClick={handleSubmit}>
          Simpan
        </Button>
      </div>
    </div>
  );
}
