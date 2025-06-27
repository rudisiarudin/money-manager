'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function AdsBanner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, []);

  return (
    <div className="w-full flex justify-center my-4">
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '728px',
          height: '90px', // tinggi minimal aman
        }}
        data-ad-client="ca-pub-1717304787775466"
        data-ad-slot="9136325128" // ✅ Slot iklan responsif biasa
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
