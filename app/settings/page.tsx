'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

function formatNumberWithDots(value: string) {
  const numberString = value.replace(/\D/g, '');
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumberFromDots(value: string) {
  return Number(value.replace(/\./g, '')) || 0;
}

export default function SettingsPage() {
  const [dailyLimit, setDailyLimit] = useState<number>(0);
  const [inputLimit, setInputLimit] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [popupType, setPopupType] = useState<'confirm' | 'success' | null>(null);

  const router = useRouter();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchLimit = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const limit = data.dailyLimit || 0;
        setDailyLimit(limit);
        setInputLimit(formatNumberWithDots(limit.toString()));
      }
      setLoading(false);
    };

    fetchLimit();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithDots(e.target.value);
    setInputLimit(formatted);
  };

  const handleSaveClick = () => {
    const newLimit = parseNumberFromDots(inputLimit);
    if (newLimit < 0) {
      alert('Limit harus berupa angka positif!');
      return;
    }
    setPopupType('confirm');
  };

  const handleConfirmSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const newLimit = parseNumberFromDots(inputLimit);

    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        dailyLimit: newLimit,
      });
      setDailyLimit(newLimit);

      setPopupType('success');
      setTimeout(() => {
        setPopupType(null);
      }, 2000);
    } catch (error) {
      console.error('Gagal update limit:', error);
      alert('Gagal menyimpan limit. Silakan coba lagi.');
    }
  };

  if (loading) return <div className="p-4">Memuat...</div>;

  return (
    <div className="min-h-screen bg-[#F7F9FA]">
      {/* Header konsisten dengan halaman profil */}
      <div className="bg-white shadow-md px-4 py-3 flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/profile')}
          className="text-[#122d5b] hover:text-[#0f234e] transition"
          aria-label="Kembali ke profil"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[#122d5b]">Atur Limit</h1>
        <div className="w-6" />
      </div>

      <div className="px-4 pb-10">
        <p className="mb-6 text-gray-700 text-sm">
          Atur batas pengeluaran harian untuk membantu mengelola keuangan kamu lebih baik dan menghindari pengeluaran berlebih.
        </p>

        <label htmlFor="limit" className="block mb-2 font-medium text-[#122d5b]">
          Batas Pengeluaran Harian (Rp)
        </label>
        <input
          id="limit"
          type="text"
          value={inputLimit}
          onChange={handleInputChange}
          inputMode="numeric"
          pattern="[0-9.]*"
          className="w-full border border-gray-300 rounded-lg p-2 mb-4"
        />

        <button
          onClick={handleSaveClick}
          className="bg-[#122d5b] hover:bg-[#0f234e] text-white px-4 py-2 rounded-lg font-semibold"
        >
          Simpan Perubahan
        </button>

        <p className="text-sm text-gray-600 mt-4">
          Saat ini:{' '}
          <strong>
            {dailyLimit.toLocaleString('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0,
            })}
          </strong>
        </p>
      </div>

      {/* Popup Konfirmasi dan Sukses */}
      <AnimatePresence>
        {popupType === 'confirm' && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPopupType(null)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Konfirmasi Perubahan Limit</h2>
              <p className="text-sm text-gray-600 mb-6">
                Apakah kamu yakin ingin mengubah limit harian menjadi{' '}
                <strong>Rp{parseNumberFromDots(inputLimit).toLocaleString('id-ID')}</strong>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setPopupType(null)}
                  className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="px-4 py-2 text-sm rounded-md bg-[#122d5b] text-white hover:bg-[#0f234e] transition"
                >
                  Ya, Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {popupType === 'success' && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto text-center"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2 }}
            >
              <h2 className="text-lg font-semibold text-green-600 mb-4">Berhasil!</h2>
              <p className="text-sm text-gray-600">
                Limit harian berhasil diperbarui menjadi{' '}
                <strong>Rp{parseNumberFromDots(inputLimit).toLocaleString('id-ID')}</strong>.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
