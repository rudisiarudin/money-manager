'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const walletOptions = [
  { source: 'Bank BCA', icon: '/banks/bca.png' },
  { source: 'ALLO Bank', icon: '/banks/allo.png' },
  { source: 'Sea Bank', icon: '/banks/seabank.png' },
  { source: 'Jenius', icon: '/banks/jenius.png' },
  { source: 'Dompet Fisik', icon: '/banks/cash.png' },
  { source: 'Bank Lain', icon: '/banks/default.png' },
];

const incomeCategoriesWithIcon = [
  { name: 'Gaji', icon: '💼' },
  { name: 'Penjualan', icon: '🛒' },
  { name: 'Freelance', icon: '🧑‍💻' },
  { name: 'Other', icon: '🔖' },
];

type Wallet = {
  id: string;
  source: string;
  balance: number;
  icon: string;
  userId: string;
};

export default function TambahDompetPage() {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [customSourceName, setCustomSourceName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Gaji');
  const [amount, setAmount] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [user, setUser] = useState<null | { uid: string }>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  // STATE untuk custom modal popup profil belum lengkap
  const [showProfileModal, setShowProfileModal] = useState(false);

  async function checkUserProfileComplete(userId: string) {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return false;

      const data = snap.data();
      return Boolean(data?.name && data?.gender && data?.birthdate);
    } catch (error) {
      console.error('Error checking user profile:', error);
      return false;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);
      fetchWallets(currentUser.uid);

      const complete = await checkUserProfileComplete(currentUser.uid);
      setProfileComplete(complete);

      if (!complete) {
        // Tampilkan custom modal (ganti window.confirm)
        setShowProfileModal(true);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchWallets = async (uid: string) => {
    try {
      const q = query(collection(db, 'wallets'), where('userId', '==', uid));
      const snapshot = await getDocs(q);
      const data: Wallet[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          source: typeof d.source === 'string' ? d.source : 'Unknown',
          balance: typeof d.balance === 'number' ? d.balance : 0,
          icon: typeof d.icon === 'string' ? d.icon : '/banks/default.png',
          userId: typeof d.userId === 'string' ? d.userId : '',
        };
      });
      setWallets(data);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('User tidak terautentikasi');
      return;
    }

    const complete = await checkUserProfileComplete(user.uid);
    if (!complete) {
      // Tampilkan custom modal di submit juga
      setShowProfileModal(true);
      return;
    }

    if (!selectedSource || !amount) {
      alert('Pilih dompet dan masukkan saldo');
      return;
    }

    const isCustom = selectedSource === 'Bank Lain';
    const finalSource = isCustom ? customSourceName.trim() : selectedSource;
    const selectedIcon =
      walletOptions.find((w) => w.source === selectedSource)?.icon || '/banks/default.png';

    if (!finalSource) {
      alert('Masukkan nama bank/dompet');
      return;
    }

    const cleanAmount = parseInt(amount.replace(/\./g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert('Nominal tidak valid.');
      return;
    }

    const now = new Date();
    const existingWallet = wallets.find((w) => w.source === finalSource);

    try {
      let walletId = '';

      if (existingWallet) {
        const newBalance = existingWallet.balance + cleanAmount;
        const walletRef = doc(db, 'wallets', existingWallet.id);
        await updateDoc(walletRef, { balance: newBalance });
        walletId = existingWallet.id;
      } else {
        const walletDoc = await addDoc(collection(db, 'wallets'), {
          source: finalSource,
          balance: cleanAmount,
          icon: selectedIcon,
          createdAt: now,
          userId: user.uid,
        });
        walletId = walletDoc.id;
      }

      console.log('walletId to be saved:', walletId);

      await addDoc(collection(db, 'transactions'), {
        title: `${selectedCategory} - ${finalSource}`,
        amount: cleanAmount,
        type: 'income',
        category: selectedCategory,
        source: finalSource,
        walletId: walletId,
        date: now.toISOString().split('T')[0],
        createdAt: now,
        userId: user.uid,
      });

      router.push('/dompet');
    } catch (error) {
      console.error('Gagal menyimpan data:', error);
      alert('Terjadi kesalahan saat menyimpan data.');
    }
  };

  const formatNumber = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  if (profileComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Memeriksa profil...</p>
      </div>
    );
  }

  // Komponen Modal Custom untuk konfirmasi lengkapi profil
  const ProfileIncompleteModal = () => (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 mx-4">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Profil Belum Lengkap</h2>
        <p className="mb-6 text-gray-700">
          Profil Anda belum lengkap. Apakah Anda ingin melengkapi profil sekarang?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => {
              setShowProfileModal(false);
              router.push('/profile/edit');
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Lengkapi Profil
          </button>
          <button
            onClick={() => setShowProfileModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
        <button onClick={() => router.back()} className="flex items-center text-blue-600">
          <ArrowLeft className="w-5 h-5 mr-1" />
        </button>
        <h1 className="text-lg font-semibold">Tambah Dompet</h1>
        <div className="w-5" />
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-4">
        {/* Pilih Dompet */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">Pilih Sumber Dana</label>
          <div className="grid grid-cols-2 gap-4">
            {walletOptions.map((wallet) => (
              <button
                key={wallet.source}
                type="button"
                onClick={() => setSelectedSource(wallet.source)}
                className={`border p-3 rounded-xl flex items-center gap-3 ${
                  selectedSource === wallet.source ? 'border-blue-600 bg-blue-50' : ''
                }`}
              >
                <Image
                  src={wallet.icon}
                  alt={wallet.source}
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <span className="text-sm font-medium">{wallet.source}</span>
              </button>
            ))}
          </div>

          {selectedSource === 'Bank Lain' && (
            <input
              type="text"
              placeholder="Masukkan nama bank atau dompet"
              value={customSourceName}
              onChange={(e) => setCustomSourceName(e.target.value)}
              className="mt-3 w-full p-3 border border-gray-300 rounded-lg"
            />
          )}
        </div>

        {/* Kategori Pemasukan */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">Kategori Pemasukan</label>
          <div className="grid grid-cols-2 gap-4">
            {incomeCategoriesWithIcon.map(({ name, icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedCategory(name)}
                className={`border p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
                  selectedCategory === name ? 'border-blue-600 bg-blue-50' : ''
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Saldo */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">Saldo Awal</label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatNumber(e.target.value))}
            placeholder="Contoh: 500.000"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tombol Simpan */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-md"
        >
          Simpan Dompet
        </button>
      </form>

      {/* Render custom modal jika perlu */}
      {showProfileModal && <ProfileIncompleteModal />}
    </div>
  );
}
