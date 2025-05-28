'use client';

import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FirebaseError } from 'firebase/app';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/');
      }
    });
    return unsubscribe;
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err) {
      const errorMessage =
        (err as FirebaseError)?.message || 'Terjadi kesalahan';
      setError(errorMessage);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    if (!resetEmail) {
      setError('Masukkan email untuk reset password');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage(
        'Email reset password telah dikirim. Periksa inbox atau folder spam Anda.'
      );
      setResetEmail('');
    } catch (err) {
      const errorMessage =
        (err as FirebaseError)?.message || 'Terjadi kesalahan saat mengirim email reset';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-100 p-4">
      <div className="max-w-sm w-full mx-auto">
        {/* Logo dan nama aplikasi */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-2">
            <Image
              src="/logo.png"
              alt="Logo ArtosKu"
              width={64}
              height={64}
            />
          </div>
          <h1 className="text-4xl font-extrabold text-primary">ArtosKu</h1>
          <p className="text-gray-600 mt-1">Dompet Digital Anda</p>
        </div>

        {/* Form login atau reset password */}
        {!resetMode ? (
          <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md w-full">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full border border-gray-300 p-2 rounded"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-3 w-full border border-gray-300 p-2 rounded"
              required
            />

            <div className="flex justify-between items-center mb-4">
              <button
                type="submit"
                className="bg-primary text-white py-2 rounded hover:bg-primary-light transition w-full max-w-xs"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setResetMessage('');
                  setResetMode(true);
                }}
                className="text-sm text-primary hover:underline ml-4"
              >
                Lupa Password?
              </button>
            </div>

            <p className="mt-4 text-center text-sm text-gray-600">
              Belum punya akun?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Register
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="bg-white p-6 rounded shadow-md w-full">
            <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {resetMessage && <p className="text-green-600 mb-4">{resetMessage}</p>}

            <input
              type="email"
              placeholder="Masukkan email Anda"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="mb-3 w-full border border-gray-300 p-2 rounded"
              required
            />

            <div className="flex justify-between items-center">
              <button
                type="submit"
                className="bg-primary text-white py-2 rounded hover:bg-primary-light transition w-full max-w-xs"
              >
                Kirim Email Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setResetMessage('');
                  setResetMode(false);
                }}
                className="text-sm text-gray-600 hover:underline ml-4"
              >
                Kembali ke Login
              </button>
            </div>
          </form>
        )}
      </div>

      <footer className="text-center text-gray-500 text-sm mt-8 mb-4">
        © {new Date().getFullYear()} Rudi Si&apos;arudin. Built with IT Palugada
      </footer>
    </div>
  );
}
