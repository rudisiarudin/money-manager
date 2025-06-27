'use client';
import { useEffect } from 'react';

// 👇 Tambahkan ini untuk kasih tahu TypeScript bahwa adsbygoogle itu valid
declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdsBanner() {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className="flex justify-center my-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', maxWidth: 728, height: 90 }}
        data-ad-client="ca-pub-1717304787775466"
        data-ad-slot="1234567890" // Ganti dengan slot milikmu
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}
