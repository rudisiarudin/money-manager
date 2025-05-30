'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function TambahTargetPage() {
  const router = useRouter();

  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [initialSaving, setInitialSaving] = useState('');

  const [modalMessage, setModalMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  const formatNumber = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const showErrorModal = (msg: string) => {
    setModalMessage(msg);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !total || !deadline) return showErrorModal('Semua kolom wajib diisi!');

    const totalAmount = parseInt(total.replace(/\./g, ''));
    const currentAmount = parseInt(initialSaving.replace(/\./g, '')) || 0;

    try {
      await addDoc(collection(db, 'targets'), {
        userId,
        name,
        total: totalAmount,
        current: currentAmount,
        deadline: deadline.toISOString(),
        createdAt: Timestamp.now(),
      });

      router.push('/target-finansial');
    } catch (error) {
      console.error('Gagal menambahkan target:', error);
      showErrorModal('Terjadi kesalahan saat menyimpan target');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/target-finansial">
          <ArrowLeft className="text-[#122d5b]" />
        </Link>
        <h1 className="text-xl font-semibold text-[#122d5b]">Tambah Target Finansial</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#122d5b]">Nama Target</label>
          <input
            type="text"
            className="w-full border rounded-lg p-2 mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Liburan ke Bali"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#122d5b]">Nominal Target</label>
          <input
            type="text"
            className="w-full border rounded-lg p-2 mt-1"
            value={formatNumber(total)}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="Contoh: 5.000.000"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#122d5b]">Deadline</label>
          <ReactDatePicker
            selected={deadline}
            onChange={(date) => setDeadline(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Pilih tanggal deadline"
            className="w-full border rounded-lg p-2 mt-1"
            minDate={new Date()}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#122d5b]">Tabungan Awal (Opsional)</label>
          <input
            type="text"
            className="w-full border rounded-lg p-2 mt-1"
            value={formatNumber(initialSaving)}
            onChange={(e) => setInitialSaving(e.target.value)}
            placeholder="Contoh: 100000"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#f4a923] text-white font-semibold py-2 rounded-lg shadow"
        >
          Simpan Target
        </button>
      </form>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full shadow-lg">
            <h2 className="text-lg font-semibold mb-4 text-red-600">Perhatian</h2>
            <p className="mb-6 text-red-600">{modalMessage}</p>
            <button
              onClick={() => setShowModal(false)}
              className="bg-[#f4a923] text-white font-semibold px-4 py-2 rounded hover:bg-yellow-400 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
