'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

type DebtCredit = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  type: 'debt' | 'credit';
  paid: boolean;
  createdAt: Timestamp;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatInputRupiah(value: string) {
  const numberString = value.replace(/\D/g, '');
  const split = numberString.split('');
  let result = '';
  let counter = 0;
  for (let i = split.length - 1; i >= 0; i--) {
    result = split[i] + result;
    counter++;
    if (counter === 3 && i !== 0) {
      result = '.' + result;
      counter = 0;
    }
  }
  return result;
}

export default function HutangPiutangPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<DebtCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<'debt' | 'credit'>('debt');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtCredit | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentError, setInstallmentError] = useState<string | null>(null);

  // --- State modal hapus custom ---
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.uid);

      const q = query(collection(db, 'debts'), where('userId', '==', user.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const items: DebtCredit[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<DebtCredit, 'id'>),
        }));

        items.sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));
        setData(items);
        setLoading(false);
      });

      return () => {
        unsubscribeSnapshot();
      };
    });

    return () => {
      unsubscribeAuth();
    };
  }, [router]);

  async function handleAdd() {
    setError(null);
    if (!title.trim()) {
      setError('Judul harus diisi');
      return;
    }
    const amt = Number(amount.replace(/\./g, ''));
    if (isNaN(amt) || amt <= 0) {
      setError('Nominal harus angka dan lebih dari 0');
      return;
    }
    if (!dueDate) {
      setError('Tanggal jatuh tempo harus diisi');
      return;
    }
    if (!userId) {
      setError('User belum teridentifikasi');
      return;
    }

    try {
      await addDoc(collection(db, 'debts'), {
        userId,
        title,
        amount: amt,
        dueDate,
        type,
        paid: false,
        createdAt: Timestamp.now(),
      });
      setTitle('');
      setAmount('');
      setDueDate('');
      setType('debt');
    } catch (e) {
      setError('Gagal menambah data');
      console.error(e);
    }
  }

  async function togglePaid(id: string, currentPaid: boolean) {
    try {
      await updateDoc(doc(db, 'debts', id), {
        paid: !currentPaid,
      });
    } catch (e) {
      console.error('Gagal update status lunas', e);
    }
  }

  // --- Modal hapus custom ---
  function openConfirmDelete(id: string) {
    setDeleteId(id);
    setConfirmDeleteOpen(true);
  }

  function closeConfirmDelete() {
    setDeleteId(null);
    setConfirmDeleteOpen(false);
  }

  async function handleDeleteConfirmed() {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'debts', deleteId));
    } catch (e) {
      console.error('Gagal menghapus data', e);
    } finally {
      closeConfirmDelete();
    }
  }

  function openInstallmentModal(debt: DebtCredit) {
    setSelectedDebt(debt);
    setInstallmentAmount('');
    setInstallmentError(null);
    setModalOpen(true);
  }

  function closeInstallmentModal() {
    setModalOpen(false);
    setSelectedDebt(null);
    setInstallmentAmount('');
    setInstallmentError(null);
  }

  async function handlePayInstallment() {
    setInstallmentError(null);
    if (!installmentAmount.trim()) {
      setInstallmentError('Nominal cicilan harus diisi');
      return;
    }
    if (!selectedDebt) return;

    const installmentNum = Number(installmentAmount.replace(/\./g, ''));
    if (isNaN(installmentNum) || installmentNum <= 0) {
      setInstallmentError('Nominal cicilan harus angka dan lebih dari 0');
      return;
    }
    if (installmentNum > selectedDebt.amount) {
      setInstallmentError('Nominal cicilan tidak boleh lebih dari sisa hutang/piutang');
      return;
    }

    try {
      const newAmount = selectedDebt.amount - installmentNum;
      const isPaid = newAmount <= 0;

      await updateDoc(doc(db, 'debts', selectedDebt.id), {
        amount: newAmount,
        paid: isPaid,
      });

      closeInstallmentModal();
    } catch (e) {
      setInstallmentError('Gagal melakukan pembayaran cicilan');
      console.error(e);
    }
  }

  if (loading) return <div className="min-h-screen flex justify-center items-center">Loading...</div>;

  return (
    <div className="min-h-screen p-4 bg-[#F7F9FA] font-sans max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          aria-label="Kembali"
          onClick={() => router.push('/')}
          className="text-[#122d5b] hover:text-[#f4a923] transition text-xl"
        >
          <ArrowLeft />
        </button>

        <h1 className="text-2xl font-bold text-[#122d5b] flex-1 text-center">
          Hutang & Piutang
        </h1>

        <div style={{ width: '1.5rem' }} />
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="font-semibold mb-2">Tambah Baru</h2>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <input
          type="text"
          placeholder="Judul (misal: Hutang ke Rudi)"
          className="w-full p-2 border rounded mb-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="text"
          placeholder="Nominal (Rp)"
          className="w-full p-2 border rounded mb-2"
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            const formatted = formatInputRupiah(val);
            setAmount(formatted);
          }}
        />

        <label className="block mb-1 text-sm text-gray-700">Tanggal Jatuh Tempo</label>
        <input
          type="date"
          className="w-full p-2 border rounded mb-2"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <select
          className="w-full p-2 border rounded mb-4"
          value={type}
          onChange={(e) => setType(e.target.value as 'debt' | 'credit')}
        >
          <option value="debt">Hutang</option>
          <option value="credit">Piutang</option>
        </select>
        <button
          onClick={handleAdd}
          className="w-full bg-[#f4a923] text-white font-semibold py-2 rounded hover:bg-yellow-400 transition"
        >
          Tambah
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-4">Daftar Hutang & Piutang</h2>
        {data.length === 0 && <p className="text-gray-500 text-center">Belum ada data</p>}
        <ul className="space-y-3 max-h-[400px] overflow-auto">
          {data.map(({ id, title, amount, dueDate, type, paid, createdAt }) => (
            <li
              key={id}
              className={`flex justify-between items-center p-3 rounded border ${
                paid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
              }`}
            >
              <div>
                <p className="font-semibold text-[#122d5b]">{title}</p>
                <p className="text-sm text-gray-600">
                  Jatuh tempo: {format(new Date(dueDate), 'dd MMM yyyy')} |{' '}
                  <span className={type === 'debt' ? 'text-red-600' : 'text-green-600'}>
                    {type === 'debt' ? 'Hutang' : 'Piutang'}
                  </span>
                </p>
              </div>
              <div className="flex flex-col items-end">
                <p className={`font-semibold ${type === 'debt' ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(amount)}
                </p>
                <label className="flex items-center gap-1 text-xs mt-1 cursor-pointer select-none">
                  <input type="checkbox" checked={paid} onChange={() => togglePaid(id, paid)} />
                  Lunas
                </label>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() =>
                    amount > 0 ? openInstallmentModal({ id, title, amount, dueDate, type, paid, createdAt }) : null
                  }
                  className={`text-xs rounded px-2 py-1 border ${
                    amount > 0 ? 'border-[#f4a923] text-[#f4a923]' : 'border-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                  title={amount > 0 ? 'Bayar cicilan' : 'Sudah lunas, tidak bisa cicilan'}
                  type="button"
                >
                  Cicil
                </button>
                <button
                  onClick={() => openConfirmDelete(id)}
                  className="text-red-600 hover:text-red-800 text-xl leading-none"
                  aria-label="Hapus data"
                  type="button"
                >
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal Cicilan */}
      {modalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
          <div className="bg-white rounded-lg p-6 w-80 max-w-full shadow-lg">
            <h3 className="font-bold mb-4 text-[#122d5b]">
              Bayar Cicilan: {selectedDebt.title}
            </h3>
            <p className="mb-2">
              Sisa: {formatCurrency(selectedDebt.amount)}
            </p>
            <input
              type="text"
              placeholder="Nominal cicilan"
              className="w-full p-2 border rounded mb-2"
              value={installmentAmount}
              onChange={(e) => {
                const val = e.target.value;
                const formatted = formatInputRupiah(val);
                setInstallmentAmount(formatted);
              }}
            />
            {installmentError && <p className="text-red-600 mb-2">{installmentError}</p>}
            <div className="flex justify-end gap-4">
              <button
                onClick={closeInstallmentModal}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition"
              >
                Batal
              </button>
              <button
                onClick={handlePayInstallment}
                className="px-4 py-2 rounded bg-[#f4a923] text-white hover:bg-yellow-400 transition"
              >
                Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-w-full shadow-lg">
            <h3 className="text-red-600 font-bold text-lg mb-4">Konfirmasi Hapus</h3>
            <p className="mb-6">Apakah Anda yakin ingin menghapus data ini?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={closeConfirmDelete}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
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
