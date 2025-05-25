'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Firebase updatePassword requires user to be recently authenticated.
  // For simplicity, here we skip re-authentication.  
  // (Better to implement re-auth flow for production apps.)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Password baru dan konfirmasi tidak cocok');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    if (!user) return;

    try {
      await updatePassword(user, newPassword);
      toast.success('Password berhasil diubah');
      router.push('/profile');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Silakan login ulang untuk mengubah password');
      } else {
        toast.error('Gagal mengubah password');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 bg-white shadow-sm">
        <Link href="/profile" className="flex items-center text-blue-600">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold">Ganti Password</h1>
        <div className="w-5" />
      </div>

      <main className="max-w-md mx-auto mt-6 px-4">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md space-y-5">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              Password Baru
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Konfirmasi Password Baru
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Ubah Password
          </button>
        </form>
      </main>
    </div>
  );
}
