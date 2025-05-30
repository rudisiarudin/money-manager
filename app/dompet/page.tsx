'use client';

import { useEffect, useState } from 'react';
import { Plus, ArrowLeft, Trash } from 'lucide-react';
import Link from 'next/link';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import SaldoChart from '@/components/SaldoChart';

type WalletItem = {
  id: string;
  source: string;
  balance: number;
  icon: string;
};

function formatCurrency(amount: number | undefined | null) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Rp0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DompetPage() {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Pengguna');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setUserName(user.displayName ?? 'Pengguna');
      } else {
        setUserId(null);
        setWallets([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, 'wallets'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const walletData: WalletItem[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Partial<WalletItem>;
        return {
          id: doc.id,
          source: typeof data.source === 'string' ? data.source : 'Unknown',
          balance: typeof data.balance === 'number' ? data.balance : 0,
          icon: typeof data.icon === 'string' ? data.icon : '/banks/default.png',
        };
      });
      setWallets(walletData);
    });

    return () => unsubscribe();
  }, [userId]);

  const total = wallets.reduce((sum, w) => sum + (typeof w.balance === 'number' ? w.balance : 0), 0);

  const handleDelete = async () => {
    if (!selectedId) return;

    try {
      const transQuery = query(collection(db, 'transactions'), where('walletId', '==', selectedId));
      const transSnapshot = await getDocs(transQuery);
      const deletePromises = transSnapshot.docs.map((docu) =>
        deleteDoc(doc(db, 'transactions', docu.id))
      );
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, 'wallets', selectedId));
      setWallets((prev) => prev.filter((w) => w.id !== selectedId));
      setSelectedId(null);
    } catch (error) {
      console.error('Gagal hapus dompet atau transaksi terkait:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
        <Link href="/" className="flex items-center text-blue-600">
          <ArrowLeft className="w-5 h-5 mr-1" />
        </Link>
        <h1 className="text-lg font-semibold">Dompet Saya</h1>
        <div className="w-5" />
      </div>

      <div className="px-4 mt-4">
        <div className="bg-gradient-to-br from-[#122d5b] to-[#13223c] text-white rounded-xl p-4 shadow">
          <p className="text-sm opacity-80">Total Balance</p>
          <h2 className="text-3xl font-bold">{formatCurrency(total)}</h2>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {wallets.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada data dompet atau rekening.</p>
        ) : (
          wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="relative bg-gray-200 text-black rounded-2xl p-4 shadow-lg"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 relative shrink-0">
                  <Image src={wallet.icon} alt="icon" fill className="object-contain rounded-md" />
                </div>
                <div>
                  <p className="text-base font-semibold leading-tight">{wallet.source}</p>
                  <p className="text-sm text-gray-600">{userName}</p>
                </div>
              </div>

              <div className="mt-2">
                <p className="text-xs text-gray-500">Saldo</p>
                <p className="text-xl font-bold">{formatCurrency(wallet.balance)}</p>
              </div>

              <div className="mt-4">
                <SaldoChart walletId={wallet.id} />
              </div>

              <div className="absolute bottom-3 right-4">
                <button
                  title="Hapus"
                  className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => setSelectedId(wallet.id)}
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Link
        href="/dompet/tambah"
        className="fixed bottom-5 right-5 bg-[#122d5b] text-white p-4 rounded-full shadow-lg hover:bg-[#0f234e] transition"
      >
        <Plus className="w-6 h-6" />
      </Link>

      {selectedId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl text-center w-full max-w-sm">
            <h2 className="text-lg font-bold text-red-600 mb-4">Hapus Dompet?</h2>
            <p className="text-sm text-gray-700 mb-6">
              Data dompet & transaksi terkait akan dihapus. Lanjutkan?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setSelectedId(null)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
