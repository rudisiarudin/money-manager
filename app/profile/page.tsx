'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type UserData = {
  name: string;
  gender?: string;
  birthdate?: string;
};

const genderIcon: Record<string, string> = {
  'Laki-laki': '👨',
  'Perempuan': '👩',
  'Lainnya': '⚧️',
};

const getGenderDisplay = (gender: string | undefined) => {
  const icon = genderIcon[gender as keyof typeof genderIcon] || '⚧️';
  return `${icon} ${gender || '-'}`;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      const docRef = doc(db, 'users', currentUser.uid);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setUserData(snap.data() as UserData);
        } else {
          setUserData({ name: 'Pengguna' });
        }
      } catch (error) {
        console.error('Gagal mengambil data user:', error);
        setUserData({ name: 'Pengguna' });
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (!user || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Memuat data profil...</p>
      </div>
    );
  }

  const initials = userData.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
        <Link href="/" className="flex items-center text-blue-600">
          <ArrowLeft className="w-5 h-5 mr-1" />
        </Link>
        <h1 className="text-lg font-semibold">Profil Saya</h1>
        <div className="w-5" />
      </div>

      <div className="max-w-md mx-auto mt-6 px-4">
        <div className="bg-white p-6 rounded-xl shadow-md">
          {/* Avatar & Info */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 text-3xl flex items-center justify-center font-bold shadow">
              {initials}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-gray-800">{userData.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          {/* Detail */}
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Jenis Kelamin</span>
              <span>{getGenderDisplay(userData.gender)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Tanggal Lahir</span>
              <span>
                {userData.birthdate
                  ? format(new Date(userData.birthdate), 'dd MMMM yyyy', { locale: id })
                  : '-'}
              </span>
            </div>
          </div>

          {/* Aksi */}
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/profile/edit"
              className="block text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium"
            >
              Edit Profil
            </Link>
            <Link
              href="/profile/change-password"
              className="block text-center border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-100 transition font-medium"
            >
              Ganti Password
            </Link>
            <button
              onClick={handleLogout}
              className="block text-center bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition font-medium"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
