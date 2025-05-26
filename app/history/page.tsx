'use client';

import { useEffect, useState, useMemo } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, runTransaction, doc } from 'firebase/firestore';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Dialog } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowLeft, Search } from 'lucide-react';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Filter states
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setTransactions([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch transactions
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
        txData.sort((a, b) => (a.date < b.date ? 1 : -1));
        setTransactions(txData);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };
    fetchTransactions();
  }, [userId]);

  // Dialog handlers
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
      const walletRef = doc(db, 'wallets', txToDelete.source);

      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) {
          throw new Error('Wallet tidak ditemukan');
        }

        // Update saldo wallet
        const newBalance = walletDoc.data().balance + txToDelete.amount;
        transaction.update(walletRef, { balance: newBalance });

        // Hapus transaksi
        const txRef = doc(db, 'transactions', txToDelete.id);
        transaction.delete(txRef);
      });

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

  // Filtered & searched transactions
  const filteredTx = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        if (
          !tx.title.toLowerCase().includes(searchLower) &&
          !tx.category.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, filterType, searchTerm]);

  // Group transactions by date category
  const groupedTx = useMemo(() => {
    const groups: Record<string, Transaction[]> = {
      'Hari ini': [],
      'Kemarin': [],
      'Lainnya': [],
    };

    filteredTx.forEach((tx) => {
      const dateObj = parseISO(tx.date);
      if (isToday(dateObj)) groups['Hari ini'].push(tx);
      else if (isYesterday(dateObj)) groups['Kemarin'].push(tx);
      else groups['Lainnya'].push(tx);
    });

    return groups;
  }, [filteredTx]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
        <Link href="/" className="flex items-center text-blue-600">
          <ArrowLeft className="w-5 h-5 mr-1" />
        </Link>
        <h1 className="text-lg font-semibold">Riwayat Transaksi</h1>
        <div className="w-5" />
      </div>

      {/* Filter & Search */}
      <div className="px-4 mt-4 flex flex-col md:flex-row md:items-center md:gap-4">
        {/* Filter */}
        <div className="flex gap-2 mb-3 md:mb-0">
          {['all', 'expense', 'income'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as 'all' | 'income' | 'expense')}
              className={`px-4 py-2 rounded-full font-semibold text-sm 
                ${
                  filterType === type
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-100'
                }`}
            >
              {type === 'all' ? 'Semua' : type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* List transaksi dengan group */}
      <div className="px-4 mt-6 space-y-6">
        {Object.entries(groupedTx).map(([groupLabel, txs]) => {
          if (txs.length === 0) return null;
          return (
            <div key={groupLabel}>
              <h2 className="text-blue-700 font-semibold mb-3">{groupLabel}</h2>
              {txs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between bg-white p-4 rounded-lg mb-3 shadow"
                >
                  <div className="flex items-center gap-4">
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
              ))}
            </div>
          );
        })}

        {filteredTx.length === 0 && (
          <p className="text-center text-gray-500">Belum ada transaksi.</p>
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
