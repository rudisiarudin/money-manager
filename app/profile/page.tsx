'use client';

import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

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

const getGenderDisplay = (gender?: string) => {
  const icon = genderIcon[gender as keyof typeof genderIcon] || '⚧️';
  return `${icon} ${gender || '-'}`;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      (async () => {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
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
      })();
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLogoutConfirm(false);
        setShowDeleteAccountModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showLogoutConfirm || showDeleteAccountModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [showLogoutConfirm, showDeleteAccountModal]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch {
      alert('Gagal logout. Silakan coba lagi.');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!user) return;
    if (!deletePassword) {
      setDeleteError('Password wajib diisi.');
      return;
    }

    setLoadingDelete(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, deletePassword);
      await reauthenticateWithCredential(user, credential);
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      router.push('/login');
    } catch (error: unknown) {
      console.error('Gagal menghapus akun:', error);

      if (error instanceof FirebaseError) {
        if (error.code === 'auth/wrong-password') {
          setDeleteError('Password salah, coba lagi.');
        } else if (error.code === 'auth/requires-recent-login') {
          setDeleteError('Session sudah lama, silakan logout lalu login ulang.');
        } else {
          setDeleteError('Gagal menghapus akun. Silakan coba lagi.');
        }
      } else {
        setDeleteError('Terjadi kesalahan tidak dikenal.');
      }
    } finally {
      setLoadingDelete(false);
    }
  };

  if (!user || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Memuat data profil...</p>
      </div>
    );
  }

  const initials = userData.name
    ? userData.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-gray-100 pb-24 relative">
      {/* Header */}
      <div className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-[#122d5b] hover:text-[#0f234e] transition">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-lg font-semibold text-gray-800">Profil</h1>
        <div className="w-6" />
      </div>

      <div className="max-w-md mx-auto mt-6 px-4">
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-700 text-4xl flex items-center justify-center font-bold shadow">
              {initials}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-gray-800">{userData.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          <div className="space-y-4 border-t border-gray-200 pt-4 text-sm text-gray-700">
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

          <div className="mt-8 space-y-3">
            <Link
              href="/profile/edit"
              className="block w-full text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium"
            >
              Edit Profil
            </Link>
            <Link
              href="/profile/change-password"
              className="block w-full text-center border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-100 transition font-medium"
            >
              Ganti Password
            </Link>
            <Link
              href="/settings"
              className="block w-full text-center border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-100 transition font-medium"
            >
              Atur Limit
            </Link>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="block w-full text-center bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition font-medium"
            >
              Keluar
            </button>
            <button
              onClick={() => setShowDeleteAccountModal(true)}
              className="block w-full text-center bg-red-800 text-white py-2 rounded-md hover:bg-red-900 transition font-medium mt-3"
            >
              Hapus Akun
            </button>
          </div>
        </div>
      </div>

      {/* Popup Logout */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Konfirmasi Logout</h2>
              <p className="text-sm text-gray-600 mb-6">
                Apakah kamu yakin ingin keluar dari akun ini?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Keluar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup Hapus Akun */}
      <AnimatePresence>
        {showDeleteAccountModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowDeleteAccountModal(false);
              setDeletePassword('');
              setDeleteError('');
            }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Konfirmasi Hapus Akun</h2>
              <p className="text-sm text-gray-600 mb-4">
                Masukkan password akun kamu untuk konfirmasi penghapusan akun.
              </p>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                disabled={loadingDelete}
              />
              {deleteError && <p className="text-red-600 text-sm mb-2">{deleteError}</p>}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAccountModal(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  disabled={loadingDelete}
                  className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loadingDelete}
                  className="px-4 py-2 text-sm rounded-md bg-red-700 text-white hover:bg-red-800 transition"
                >
                  {loadingDelete ? 'Memproses...' : 'Hapus Akun'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
