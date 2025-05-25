'use client';

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/');
      }
    });
    return unsubscribe;
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-100 p-4">
      <div className="max-w-sm w-full mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-blue-600">DuitKu</h1>
          <p className="text-gray-600 mt-1">Dompet Digital Anda</p>
        </div>

        <form onSubmit={handleRegister} className="bg-white p-6 rounded shadow-md w-full">
          <h1 className="text-2xl font-bold mb-4">Register</h1>
          {error && <p className="text-red-500 mb-4">{error}</p>}

          <input
            type="text"
            placeholder="Nama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-3 w-full border border-gray-300 p-2 rounded"
            required
          />

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

          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition w-full max-w-xs"
            >
              Register
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-600">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>

      <footer className="text-center text-gray-500 text-sm mt-8 mb-4">
         © {new Date().getFullYear()} Rudi Si'arudin. Built with IT Palugada
    </footer>

    </div>
  );
}
