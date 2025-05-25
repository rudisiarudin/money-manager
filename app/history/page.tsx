'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Dialog } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';

type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  icon?: string;
  date: string; // ISO string
  source: string; // wallet id
  userId: string;
};

type Wallet = {
  id: string;
  source: string;
  balance: number;
  icon: string;
  userId: string;
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

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get userId on auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setTransactions([]);
        setWallets([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch wallets filtered by userId
  useEffect(() => {
    if (!userId) return;

    const fetchWallets = async () => {
      try {
        const walletsQuery = query(
          collection(db, 'wallets'),
          where('userId', '==', userId)
        );
        const walletSnap = await getDocs(walletsQuery);
        const walletData = walletSnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Wallet, 'id'>),
        }));
        setWallets(walletData);
      } catch (error) {
        console.error('Error fetching wallets:', error);
      }
    };
    fetchWallets();
  }, [userId]);

  // Fetch transactions filtered by userId
  useEffect(() => {
    if (!userId) return;

    const fetchTransactions = async () => {
      try {
        const txQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', userId)
        );
        const txSnap = await getDocs(txQuery);
        const txData = txSnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Transaction, 'id'>),
        }));
        // Sort by date descending
        txData.sort((a, b) => (a.date < b.date ? 1 : -1));
        setTransactions(txData);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };
    fetchTransactions();
  }, [userId]);

  const openDeleteDialog = (tx: Transaction) => {
    if (tx.type === 'income') {
      toast.error('Transaksi pemasukan tidak bisa dihapus');
      return;
    }
    setTxToDelete(tx);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTxToDelete(null);
  };

  const handleDelete = async () => {
    if (!txToDelete) return;

    try {
      // Hapus transaksi
      await deleteDoc(doc(db, 'transactions', txToDelete.id));

      // Update saldo wallet
      const wallet = wallets.find((w) => w.id === txToDelete.source);
      if (wallet) {
        const walletRef = doc(db, 'wallets', wallet.id);
        // Karena ini expense, hapus transaksi berarti saldo bertambah kembali
        const newBalance = wallet.balance + txToDelete.amount;
        await updateDoc(walletRef, { balance: newBalance });
      }

      // Update state lokal
      setTransactions((prev) => prev.filter((tx) => tx.id !== txToDelete.id));
      toast.success('Transaksi berhasil dihapus');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menghapus transaksi');
    } finally {
      closeDialog();
    }
  };

  // Format nominal Rp
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
        <Link href="/" className="flex items-center text-blue-600">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold">Riwayat Transaksi</h1>
        <div className="w-5" />
      </div>

      {/* List transaksi */}
      <div className="px-4 mt-4">
        {transactions.length === 0 ? (
          <p className="text-center text-gray-500">Belum ada transaksi.</p>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between bg-white p-4 rounded-lg mb-3 shadow"
            >
              <div className="flex items-center gap-4">
                {/* Icon kategori (emoji) */}
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-2xl select-none">
                  {icons[tx.category] || (tx.icon && tx.icon.length <= 2 ? tx.icon : '📦')}
                </div>
                <div>
                  <p className="font-medium">{tx.title}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <p
                  className={`font-semibold ${
                    tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </p>

                {/* Tombol hapus hanya untuk expense */}
                {tx.type === 'expense' && (
                  <button
                    onClick={() => openDeleteDialog(tx)}
                    className="text-red-600 hover:text-red-800 transition"
                    aria-label="Hapus transaksi"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog konfirmasi hapus */}
      <Dialog
        open={isDialogOpen}
        onClose={closeDialog}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      >
        <Dialog.Panel className="bg-white rounded-lg max-w-sm w-full p-6 shadow-lg border-2 border-red-600">
          <Dialog.Title className="text-lg font-semibold text-red-600">
            Konfirmasi Hapus Transaksi
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-700">
            Apakah Anda yakin ingin menghapus transaksi ini? Data tidak bisa
            dikembalikan.
          </Dialog.Description>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>
              Hapus
            </Button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}
