'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type Participant = {
  id: number;
  name: string;
};

type Item = {
  id: number;
  name: string;
  price: number;
  sharedByIds: number[];
};

function formatRupiah(num: number | string) {
  if (typeof num === 'string') {
    const numeric = num.replace(/\D/g, '');
    if (numeric === '') return '0';
    return Number(numeric).toLocaleString('id-ID');
  }
  if (isNaN(num)) return '0';
  return num.toLocaleString('id-ID');
}

export default function SplitBillPage() {
  const router = useRouter();

  // Peserta
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 1, name: 'Inzar' },
    { id: 2, name: 'Rudi' },
  ]);
  const [newParticipantName, setNewParticipantName] = useState('');

  // Item
  const [items, setItems] = useState<Item[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemPriceInput, setItemPriceInput] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);

  // Pajak dan mode split
  const [taxPercent, setTaxPercent] = useState('');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('custom');

  // Hasil dan popup
  const [result, setResult] = useState<Record<number, number> | null>(null);
  const [showPopupResult, setShowPopupResult] = useState(false);

  // Popup hapus peserta
  const [showConfirmDeleteParticipant, setShowConfirmDeleteParticipant] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);

  // --- Fungsi ---

  // Format input harga dengan titik ribuan saat input
  const onChangePriceInput = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (numeric === '') {
      setItemPriceInput('');
      return;
    }
    const formatted = Number(numeric).toLocaleString('id-ID');
    setItemPriceInput(formatted);
  };

  // Tambah peserta baru
  const addParticipant = () => {
    const name = newParticipantName.trim();
    if (!name) {
      alert('Nama peserta tidak boleh kosong.');
      return;
    }
    const isDuplicate = participants.some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      alert('Nama peserta sudah ada.');
      return;
    }
    const newId = participants.length > 0 ? participants[participants.length - 1].id + 1 : 1;
    const newParticipants = [...participants, { id: newId, name }];
    setParticipants(newParticipants);
    setNewParticipantName('');
    setSelectedParticipantIds([newId]);
    setResult(null);
  };

  // Minta popup konfirmasi hapus peserta
  const onRequestDeleteParticipant = (participant: Participant) => {
    setParticipantToDelete(participant);
    setShowConfirmDeleteParticipant(true);
  };

  // Konfirmasi hapus peserta
  const confirmDeleteParticipant = () => {
    if (!participantToDelete) return;

    // Hapus peserta
    const newParticipants = participants.filter(({ id }) => id !== participantToDelete.id);
    setParticipants(newParticipants);

    // Hapus peserta dari items, hapus item tanpa peserta
    const newItems = items
      .map((item) => ({
        ...item,
        sharedByIds: item.sharedByIds.filter((pid) => pid !== participantToDelete.id),
      }))
      .filter((item) => item.sharedByIds.length > 0);

    setItems(newItems);

    setShowConfirmDeleteParticipant(false);
    setParticipantToDelete(null);
    setResult(null);
  };

  // Cancel hapus peserta
  const cancelDeleteParticipant = () => {
    setShowConfirmDeleteParticipant(false);
    setParticipantToDelete(null);
  };

  // Toggle pilihan peserta untuk item
  const toggleParticipantSelection = (id: number) => {
    if (selectedParticipantIds.includes(id)) {
      setSelectedParticipantIds(selectedParticipantIds.filter((pid) => pid !== id));
    } else {
      setSelectedParticipantIds([...selectedParticipantIds, id]);
    }
  };

  // Tambah item baru
  const addItem = () => {
    if (!itemName.trim()) {
      alert('Nama menu tidak boleh kosong.');
      return;
    }
    const priceNumber = Number(itemPriceInput.replace(/\D/g, ''));
    if (!priceNumber || isNaN(priceNumber)) {
      alert('Harga harus angka lebih besar dari 0.');
      return;
    }
    if (selectedParticipantIds.length === 0) {
      alert('Pilih minimal satu peserta yang berbagi item ini.');
      return;
    }

    const newItem: Item = {
      id: Date.now(),
      name: itemName.trim(),
      price: priceNumber,
      sharedByIds: selectedParticipantIds,
    };

    setItems([...items, newItem]);
    setItemName('');
    setItemPriceInput('');
    setSelectedParticipantIds([]);
    setResult(null);
  };

  // Hapus item
  const removeItem = (idToRemove: number) => {
    setItems(items.filter((item) => item.id !== idToRemove));
    setResult(null);
  };

  // Hitung split sesuai mode
  const calculateSplit = () => {
    if (participants.length === 0) {
      alert('Tambahkan peserta terlebih dahulu.');
      return;
    }
    if (items.length === 0) {
      alert('Tambahkan item terlebih dahulu.');
      return;
    }

    const tax = parseFloat(taxPercent) || 0;

    let totalPrice = 0;
    const totals: Record<number, number> = {};
    participants.forEach(({ id }) => (totals[id] = 0));

    if (splitMode === 'custom') {
      // Hitung per item dibagi berdasarkan siapa yang berbagi item
      items.forEach(({ price, sharedByIds }) => {
        totalPrice += price;
        const splitCount = sharedByIds.length;
        sharedByIds.forEach((pid) => {
          totals[pid] += price / splitCount;
        });
      });
    } else if (splitMode === 'equal') {
      // Bagi rata total semua item (plus pajak) ke semua peserta
      items.forEach(({ price }) => {
        totalPrice += price;
      });
      const perPerson = totalPrice / participants.length;
      participants.forEach(({ id }) => (totals[id] = perPerson));
    }

    // Pajak proporsional (berdasarkan total sebelum pajak)
    const totalTax = (totalPrice * tax) / 100;
    const totalBeforeTax = Object.values(totals).reduce((a, b) => a + b, 0);

    const totalsWithTax: Record<number, number> = {};
    participants.forEach(({ id }) => {
      const taxForId = totalBeforeTax === 0 ? 0 : (totals[id] / totalBeforeTax) * totalTax;
      totalsWithTax[id] = totals[id] + taxForId;
    });

    setResult(totalsWithTax);
    setShowPopupResult(true);
  };

  // Tutup popup hasil
  const closePopupResult = () => {
    setShowPopupResult(false);
  };

  return (
    <>
      <div className="min-h-screen p-6 bg-gray-50 font-sans max-w-md mx-auto">
        {/* Tombol Back + Judul */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            aria-label="Kembali ke Home"
            className="p-1 rounded hover:bg-gray-200 transition"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-[#122d5b]">Split Bill Dinamis</h1>
        </div>

        {/* Tambah Peserta */}
        <div className="bg-white rounded-lg p-4 shadow mb-6">
          <h2 className="font-semibold mb-2 flex justify-between items-center">
            Tambah Peserta
          </h2>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Nama peserta baru"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              className="flex-grow border border-gray-300 rounded px-3 py-2"
              onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
            />
            <button
              onClick={addParticipant}
              className="bg-[#122d5b] text-white px-4 py-2 rounded hover:bg-[#244c90] transition"
            >
              Tambah
            </button>
          </div>
          {participants.length > 0 ? (
            <ul>
              {participants.map(({ id, name }) => (
                <li
                  key={id}
                  className="flex justify-between items-center py-1 border-b border-gray-200"
                >
                  <span>{name}</span>
                  <button
                    onClick={() => onRequestDeleteParticipant({ id, name })}
                    className="text-red-500 hover:underline text-sm"
                    title={`Hapus peserta ${name}`}
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Belum ada peserta.</p>
          )}
        </div>

        {/* Tambah Item */}
        <div className="bg-white rounded-lg p-4 shadow mb-6">
          <h2 className="font-semibold mb-2">Tambah Item</h2>
          <input
            type="text"
            placeholder="Nama menu"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
          />
          <input
            type="text"
            placeholder="Harga (contoh: 10000)"
            value={itemPriceInput}
            onChange={(e) => onChangePriceInput(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
          />

          <div className="mb-2">
            <p className="mb-1 font-semibold">Pilih peserta yang berbagi item ini:</p>
            <div className="flex flex-wrap gap-2">
              {participants.map(({ id, name }) => (
                <label
                  key={id}
                  className={`cursor-pointer px-3 py-1 rounded border ${
                    selectedParticipantIds.includes(id)
                      ? 'bg-[#122d5b] text-white border-[#122d5b]'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedParticipantIds.includes(id)}
                    onChange={() => toggleParticipantSelection(id)}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={addItem}
            className="bg-[#122d5b] text-white px-4 py-2 rounded hover:bg-[#244c90] transition"
          >
            Tambah Item
          </button>

          {items.length > 0 && (
            <ul className="mt-4 border border-gray-300 rounded max-h-48 overflow-auto">
              {items.map(({ id, name, price, sharedByIds }) => (
                <li
                  key={id}
                  className="flex justify-between items-center border-b border-gray-200 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-gray-600">
                      Rp {formatRupiah(price)} - Berbagi: {sharedByIds.map((pid) => {
                        const p = participants.find((p) => p.id === pid);
                        return p ? p.name : '';
                      }).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(id)}
                    className="text-red-600 hover:underline text-sm"
                    title="Hapus item"
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pajak dan Mode Split */}
        <div className="bg-white rounded-lg p-4 shadow mb-6">
          <label className="block mb-2 font-semibold">
            Pajak (%):
            <input
              type="number"
              min={0}
              max={100}
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded px-3 py-2"
              placeholder="Masukkan persen pajak"
            />
          </label>

          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="splitMode"
                checked={splitMode === 'custom'}
                onChange={() => setSplitMode('custom')}
              />
              <span>Split Item per Peserta</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="splitMode"
                checked={splitMode === 'equal'}
                onChange={() => setSplitMode('equal')}
              />
              <span>Split Rata Semua Peserta</span>
            </label>
          </div>
        </div>

        {/* Tombol Hitung */}
        <button
          onClick={calculateSplit}
          className="bg-[#122d5b] w-full py-3 rounded text-white font-semibold hover:bg-[#244c90] transition"
        >
          Hitung Split Bill
        </button>
      </div>

      {/* Popup Hasil */}
      {showPopupResult && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-6 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 relative">
            <h2 className="text-xl font-bold mb-4 text-center">Hasil Split Bill</h2>
            <ul>
              {participants.map(({ id, name }) => (
                <li
                  key={id}
                  className="flex justify-between border-b border-gray-200 py-2"
                >
                  <span>{name}</span>
                  <span>Rp {formatRupiah(result[id] || 0)}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={closePopupResult}
              className="mt-6 bg-[#122d5b] w-full py-2 rounded text-white font-semibold hover:bg-[#244c90] transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Popup Konfirmasi Hapus Peserta */}
      {showConfirmDeleteParticipant && participantToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-6 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-red-600">Konfirmasi Hapus Peserta</h2>
            <p className="mb-4">
              Apakah kamu yakin ingin menghapus peserta{' '}
              <strong>{participantToDelete.name}</strong>? Data item yang terkait akan diperbarui.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={cancelDeleteParticipant}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteParticipant}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
