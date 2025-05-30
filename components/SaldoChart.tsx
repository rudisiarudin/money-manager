'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

type Props = {
  walletId: string;
};

type DataPoint = {
  date: string;
  balance: number;
};

export default function SaldoChart({ walletId }: Props) {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
       const q = query(
            collection(db, 'transactions'),
            where('walletId', '==', walletId),
            orderBy('date', 'asc')
            );

        const snapshot = await getDocs(q);

        let runningBalance = 0;
        const history: DataPoint[] = [];

        snapshot.docs.forEach((doc) => {
          const item = doc.data();
          const amount = item.amount || 0;
          runningBalance += item.type === 'income' ? amount : -amount;

          const dateObj = item.date?.toDate?.() || new Date();
          const dateStr = new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
          }).format(dateObj);

          history.push({
            date: dateStr,
            balance: runningBalance,
          });
        });

        setData(history);
      } catch (error) {
        console.error('Gagal mengambil data transaksi untuk grafik:', error);
      }
    };

    fetchData();
  }, [walletId]);

  if (data.length === 0) return <p className="text-sm text-gray-500">Tidak ada data grafik</p>;

  return (
    <div className="mt-4 h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip formatter={(value: number) => `Rp${value.toLocaleString('id-ID')}`} />
          <Line type="monotone" dataKey="balance" stroke="#122d5b" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
