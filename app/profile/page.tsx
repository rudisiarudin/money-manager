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
      console.log('onAuthStateChanged user:', currentUser);
      if (!currentUser) {
        console.log('No user, redirect to login');
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
          console.warn('User data doc not found, setting fallback');
          setUserData({ name: 'User' }); // fallback supaya tidak loading terus
        }
      } catch (error) {
        console.error('Error getting user data:', error);
        setUserData({ name: 'User' });
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
        <p>Loading...</p>
      </div>
    );
  }

  const initials = userData.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
        <Link href="/" className="flex items-center text-blue-600">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold">Profil Saya</h1>
        <div className="w-5" />
      </div>

      <div className="max-w-md mx-auto mt-6 px-4">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 text-3xl flex items-center justify-center font-bold">
              {initials}
            </div>
            <h2 className="mt-3 text-xl font-semibold">{userData.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <span className="font-medium">Gender: </span>
              {getGenderDisplay(userData.gender)}
            </p>
            <p>
              <span className="font-medium">Tanggal Lahir: </span>
              {userData.birthdate
                ? format(new Date(userData.birthdate), 'dd MMMM yyyy', { locale: id })
                : '-'}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/profile/edit"
              className="block text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
            >
              Edit Profil
            </Link>
            <Link
              href="/profile/change-password"
              className="block text-center border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-100 transition"
            >
              Ganti Password
            </Link>
            <button
              onClick={handleLogout}
              className="block text-center bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
