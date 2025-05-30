'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type WalletItem = {
  id: string;
  source: string;
  balance: number;
  type: 'bank' | 'cash';
  icon: string;
};

type CategoryItem = {
  name: string;
  icon: string;
};

const categoryOptions: CategoryItem[] = [
  { name: 'Food', icon: '🍔' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Health', icon: '💊' },
  { name: 'Bills', icon: '💡' },
  { name: 'Entertainment', icon: '🎮' },
  { name: 'Other', icon: '📝' },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
};


export default function TambahTransaksiModal({ onClose }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // State popup saldo kurang
  const [showSaldoKurangPopup, setShowSaldoKurangPopup] = useState(false);
  const [saldoKurangMessage, setSaldoKurangMessage] = useState('');

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

  const handleSubmit = () => {
    if (!title || !amount || !selectedCategory || !selectedWalletId) {
      toast.error('Lengkapi semua field');
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
      // Tampilkan popup saldo kurang dengan pesan
      setSaldoKurangMessage(
        `Saldo dompet "${wallet.source}" sebesar Rp${wallet.balance.toLocaleString(
          'id-ID'
        )} tidak cukup untuk transaksi sebesar Rp${parsedAmount.toLocaleString('id-ID')}.`
      );
      setShowSaldoKurangPopup(true);
      return;
    }

    prosesTambahTransaksi(title, parsedAmount, selectedCategory, wallet);
  };

  const prosesTambahTransaksi = async (
    title: string,
    parsedAmount: number,
    selectedCategory: CategoryItem,
    wallet: WalletItem
  ) => {
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
      onClose();
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
    <>
      {/* Modal utama */}
      <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 px-4">
        <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg relative">
          <h2 className="text-lg font-semibold mb-4">Tambah Transaksi</h2>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block font-medium mb-1">Judul</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Beli makan siang"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Kategori</label>
              <div className="grid grid-cols-4 gap-3">
                {categoryOptions.map((cat) => (
                  <button
                    type="button"
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat)}
                    className={clsx(
                      'border rounded-lg p-2 flex flex-col items-center text-xs transition',
                      selectedCategory?.name === cat.name
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-blue-300'
                    )}
                  >
                    <div className="text-xl">{cat.icon}</div>
                    <span className="mt-1">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Nominal</label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={amount}
                onChange={(e) => setAmount(formatCurrency(e.target.value))}
                placeholder="Contoh: 50.000"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Dompet</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
              >
                <option value="">-- Pilih Dompet --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.source} - Rp{Number(w.balance).toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tombol simpan & batal */}
          <div className="mt-6 flex justify-end gap-3 text-sm">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>

      {/* Popup saldo kurang di atas modal */}
      {showSaldoKurangPopup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center px-4 z-[99999]"
          aria-modal="true"
          role="alertdialog"
        >
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Saldo Tidak Mencukupi</h3>
            <p className="mb-6">{saldoKurangMessage}</p>
            <button
              onClick={() => setShowSaldoKurangPopup(false)}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
