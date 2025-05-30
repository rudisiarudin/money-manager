'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { Calendar, ArrowLeft, Plus } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Target {
  id: string;
  name: string;
  total: number;
  current: number;
  deadline: string;
  createdAt: Timestamp;
}

type FilterStatus = 'all' | 'completed' | 'incomplete';
type SortOption = 'deadline' | 'name' | 'progress';

export default function TargetFinansialPage() {
  const router = useRouter();

  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortOption, setSortOption] = useState<SortOption>('deadline');

  const [nearDeadlineTargets, setNearDeadlineTargets] = useState<Target[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, 'targets'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Target, 'id'>),
        }));
        setTargets(data);
        setLoading(false);
      } else {
        setTargets([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredTargets = useMemo(() => {
    return targets.filter(target => {
      const progress = target.current / target.total;
      if (filterStatus === 'completed') return progress >= 1;
      if (filterStatus === 'incomplete') return progress < 1;
      return true;
    });
  }, [targets, filterStatus]);

  const sortedTargets = useMemo(() => {
    return [...filteredTargets].sort((a, b) => {
      if (sortOption === 'deadline') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'progress') {
        const progA = a.current / a.total;
        const progB = b.current / b.total;
        return progB - progA;
      }
      return 0;
    });
  }, [filteredTargets, sortOption]);

  useEffect(() => {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const near = targets.filter(t => {
      const dl = new Date(t.deadline);
      const progress = t.current / t.total;
      return dl >= now && dl <= in7days && progress < 1;
    });
    setNearDeadlineTargets(near);
  }, [targets]);

  const totalTargets = targets.length;
  const totalTerkumpul = targets.reduce((acc, t) => acc + t.current, 0);
  const totalTercapai = targets.filter(t => t.current >= t.total).length;

  if (loading)
    return (
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F7F9FA] p-4 pb-28 max-w-lg mx-auto relative">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          aria-label="Kembali ke Hoem"
          className="text-[#122d5b] hover:text-[#0f2345] transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-[#122d5b]">Target Finansial</h1>
      </div>

      {/* Ringkasan */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-2 text-[#122d5b] font-semibold">
        <p>Total Target: {totalTargets}</p>
        <p>Total Dana Terkumpul: Rp {totalTerkumpul.toLocaleString('id-ID')}</p>
        <p>Total Target Tercapai: {totalTercapai}</p>
      </div>

      {/* Notifikasi deadline dekat */}
      {nearDeadlineTargets.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-xl p-3 mb-6">
          <strong>⚠️ Perhatian!</strong> Ada {nearDeadlineTargets.length} target dengan deadline kurang dari 7 hari.
        </div>
      )}

      {/* Filter & Sort */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="flex-grow min-w-[150px] border rounded p-2"
          aria-label="Filter status target"
        >
          <option value="all">Semua Target</option>
          <option value="completed">Target Tercapai</option>
          <option value="incomplete">Target Belum Tercapai</option>
        </select>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="flex-grow min-w-[150px] border rounded p-2"
          aria-label="Sortir target"
        >
          <option value="deadline">Sortir Berdasarkan Deadline</option>
          <option value="name">Sortir Berdasarkan Nama</option>
          <option value="progress">Sortir Berdasarkan Progress</option>
        </select>
      </div>

      {/* List target */}
      {sortedTargets.length === 0 ? (
        <p className="text-center text-gray-500">Belum ada target finansial sesuai filter.</p>
      ) : (
        <ul className="space-y-6">
          {sortedTargets.map((target) => {
            const progress = Math.min((target.current / target.total) * 100, 100);
            const isCompleted = progress >= 100;
            const isAlmost = progress >= 90 && progress < 100;

            const data: ChartData<'bar'> = {
              labels: ['Target Finansial'],
              datasets: [
                {
                  label: 'Terkumpul',
                  data: [target.current],
                  backgroundColor:
                    progress < 50 ? '#f87171' : progress < 80 ? '#fbbf24' : '#22c55e',
                },
                {
                  label: 'Sisa',
                  data: [target.total - target.current],
                  backgroundColor: '#e0e0e0',
                },
              ],
            };

            const options: ChartOptions<'bar'> = {
              indexAxis: 'y',
              animation: {
                duration: 800,
                easing: 'easeOutQuart',
              },
              scales: {
                x: {
                  stacked: true,
                  max: target.total,
                  ticks: {
                    callback: function (value: number | string) {
                      const num = typeof value === 'number' ? value : parseFloat(value);
                      return `Rp ${num.toLocaleString('id-ID')}`;
                    },
                  },
                },
                y: {
                  stacked: true,
                },
              },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    boxWidth: 12,
                    padding: 10,
                  },
                },
                tooltip: {
                  callbacks: {
                    label: function (context: TooltipItem<'bar'>) {
                      return `${context.dataset.label}: Rp ${context.parsed.x?.toLocaleString('id-ID')}`;
                    },
                  },
                },
              },
              responsive: true,
              maintainAspectRatio: false,
            };

            const deadlineDate = new Date(target.deadline);
            const formattedDeadline = deadlineDate.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <li
                key={target.id}
                className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition cursor-pointer relative"
              >
                <Link href={`/target-finansial/${target.id}`} className="block pr-20">
                  <h2
                    className={`text-lg font-semibold ${
                      isCompleted
                        ? 'text-green-600'
                        : isAlmost
                        ? 'text-yellow-600'
                        : 'text-[#122d5b]'
                    }`}
                  >
                    {target.name}
                    {isCompleted && (
                      <span className="ml-2 text-sm bg-green-200 text-green-800 rounded px-2 py-0.5">
                        🎉 Tercapai
                      </span>
                    )}
                    {isAlmost && (
                      <span className="ml-2 text-sm bg-yellow-200 text-yellow-800 rounded px-2 py-0.5">
                        🔥 Hampir
                      </span>
                    )}
                  </h2>
                  <p>Total Target: Rp {target.total.toLocaleString('id-ID')}</p>
                  <p>Tabungan Saat Ini: Rp {target.current.toLocaleString('id-ID')}</p>

                  <p className="flex items-center gap-2 text-[#122d5b] mt-1">
                    <Calendar size={18} className="text-[#f4a923]" />
                    <span>{formattedDeadline}</span>
                  </p>

                  <div className="mt-3 h-14 relative">
                    <Bar options={options} data={data} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Tombol floating tambah target */}
      <Link
        href="/target-finansial/tambah"
        aria-label="Tambah Target Finansial"
        className="
          fixed bottom-6 right-6 
          bg-[#f4a923] 
          hover:bg-yellow-400 
          text-white 
          w-14 h-14 
          rounded-full 
          flex items-center justify-center 
          shadow-lg 
          transition 
          cursor-pointer
          z-50
        "
      >
        <Plus size={32} />
      </Link>
    </div>
  );
}
