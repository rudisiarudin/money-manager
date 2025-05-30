'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
} from 'firebase/firestore';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface SavingRecord {
  amount: number;
  time: string; // ISO string
}

interface Target {
  id: string;
  name: string;
  current: number;
  total: number;
  deadline: string;
  savingRecords: SavingRecord[];
}

export default function DetailTargetPage() {
  const { id } = useParams();
  const router = useRouter();

  const [target, setTarget] = useState<Target | null>(null);
  const [amountToAdd, setAmountToAdd] = useState('');
  const [showConfirm, setShowConfirm] = useState(false); // popup konfirmasi muncul?

  useEffect(() => {
    const fetchTarget = async () => {
      const docRef = doc(db, 'targets', id as string);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        if (data) {
          setTarget({
            id: docSnap.id,
            name: data.name || '',
            current: Number(data.current) || 0,
            total: Number(data.total) || 0,
            deadline: data.deadline || '',
            savingRecords: Array.isArray(data.savingRecords) ? data.savingRecords : [],
          });
        } else {
          alert('Data target tidak valid');
          router.push('/target-finansial');
        }
      } else {
        alert('Target tidak ditemukan');
        router.push('/target-finansial');
      }
    };

    fetchTarget();
  }, [id, router]);

  const formatWithThousandSeparator = (value: string) => {
    const onlyNums = value.replace(/\D/g, '');
    return onlyNums.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAddSaving = async () => {
    const tambah = parseInt(amountToAdd.replace(/\./g, ''), 10);
    if (!tambah || tambah <= 0) return alert('Masukkan nominal yang valid');

    const newCurrent = (target?.current || 0) + tambah;

    const newRecord: SavingRecord = {
      amount: tambah,
      time: new Date().toISOString(),
    };

    await updateDoc(doc(db, 'targets', id as string), {
      current: newCurrent,
      savingRecords: arrayUnion(newRecord),
    });

    setTarget({
      ...target!,
      current: newCurrent,
      savingRecords: [...(target?.savingRecords || []), newRecord],
    });

    setAmountToAdd('');
  };

  const confirmDelete = async () => {
    await deleteDoc(doc(db, 'targets', id as string));
    setShowConfirm(false);
    router.push('/target-finansial');
  };

  if (!target) return <div className="p-4">Loading...</div>;

  const progress = Math.min((target.current / target.total) * 100, 100).toFixed(1);

  return (
    <div className="min-h-screen bg-[#F7F9FA] p-4 pb-24 relative">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/target-finansial">
          <ArrowLeft className="text-[#122d5b]" />
        </Link>
        <h1 className="text-xl font-semibold text-[#122d5b]">Detail Target</h1>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#122d5b]">{target.name}</h2>
          <button
            onClick={() => setShowConfirm(true)}
            className="text-red-500"
            aria-label="Hapus target"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Deadline: {new Date(target.deadline).toLocaleDateString('id-ID')}
        </div>

        <div className="text-sm">
          Tabungan: Rp{Number(target.current).toLocaleString('id-ID')} / Rp{Number(target.total).toLocaleString('id-ID')}
        </div>

        <div className="w-full bg-gray-200 h-4 rounded-lg overflow-hidden">
          <div
            className="bg-green-500 h-4"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-right text-gray-500">{progress}% tercapai</div>

        <div className="pt-4 space-y-2">
          <label className="block text-sm font-medium text-[#122d5b]">Tambah Tabungan</label>
          <input
            type="text"
            className="w-full border rounded-lg p-2"
            value={amountToAdd}
            onChange={(e) => {
              const formatted = formatWithThousandSeparator(e.target.value);
              setAmountToAdd(formatted);
            }}
            placeholder="Contoh: 100.000"
          />
          <button
            onClick={handleAddSaving}
            className="w-full bg-[#f4a923] text-white font-semibold py-2 rounded-lg shadow"
          >
            Tambahkan
          </button>
        </div>

        {/* Riwayat tabungan */}
        <div className="pt-6">
          <h3 className="text-lg font-semibold text-[#122d5b] mb-2">Riwayat Tabungan</h3>
          {!target.savingRecords || target.savingRecords.length === 0 ? (
            <p className="text-gray-500 text-sm">Belum ada riwayat tabungan.</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto space-y-2">
              {target.savingRecords
                .slice()
                .sort((a: SavingRecord, b: SavingRecord) => new Date(b.time).getTime() - new Date(a.time).getTime())
                .map((item: SavingRecord, idx: number) => (
                  <li key={idx} className="flex justify-between text-sm bg-gray-100 p-2 rounded">
                    <span>Rp {Number(item.amount).toLocaleString('id-ID')}</span>
                    <span className="text-gray-600">
                      {new Date(item.time).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* Popup konfirmasi hapus */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-w-full shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-red-600">Konfirmasi Hapus</h2>
            <p>Yakin ingin menghapus target ini?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
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
