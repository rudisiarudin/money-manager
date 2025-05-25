'use client';

import { useEffect, useState } from 'react';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image'; // ✅ Import Image

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setWallets([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchWallets = async () => {
      try {
        const q = query(collection(db, 'wallets'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const walletData: WalletItem[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            source: typeof data.source === 'string' ? data.source : 'Unknown',
            balance: typeof data.balance === 'number' ? data.balance : 0,
            icon: typeof data.icon === 'string' ? data.icon : '/banks/default.png',
          };
        });

        setWallets(walletData);
      } catch (error) {
        console.error('Error fetching wallets:', error);
      }
    };

    fetchWallets();
  }, [userId]);

  const total = wallets.reduce(
    (sum, w) => sum + (typeof w.balance === 'number' ? w.balance : 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
        <Link href="/" className="flex items-center text-blue-600">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold">Dompet Saya</h1>
        <div className="w-5" />
      </div>

      {/* Total Balance */}
      <div className="px-4 mt-4">
        <div className="bg-blue-100 text-blue-800 rounded-xl p-4 shadow">
          <p className="text-sm">Total Balance</p>
          <h2 className="text-2xl font-bold">{formatCurrency(total)}</h2>
        </div>
      </div>

      {/* Wallet List */}
      <div className="px-4 mt-6">
        {wallets.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada data dompet atau rekening.</p>
        ) : (
          wallets.map((wallet) => (
            <Card key={wallet.id} className="mb-3">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border bg-white">
                  <Image
                    src={wallet.icon}
                    alt={wallet.source}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex justify-between items-center w-full">
                  <div>
                    <p className="font-medium">{wallet.source}</p>
                    <p className="text-sm text-gray-500">Saldo</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(wallet.balance)}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Tambah Dompet Button */}
      <Link
        href="/dompet/tambah"
        className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg"
      >
        <PlusCircle className="w-6 h-6" />
      </Link>
    </div>
  );
}
