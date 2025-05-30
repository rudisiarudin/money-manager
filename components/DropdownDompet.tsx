'use client';

import React from 'react';

interface Wallet {
  id: string;
  name: string;
}

interface DropdownDompetProps {
  wallets: Wallet[];
  selectedWalletId: string;
  onChange: (walletId: string) => void;
}

export default function DropdownDompet({
  wallets,
  selectedWalletId,
  onChange,
}: DropdownDompetProps) {
  return (
    <select
      className="w-full border rounded-lg p-2 mt-1"
      value={selectedWalletId}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">-- Pilih Dompet --</option>
      {wallets.map((wallet) => (
        <option key={wallet.id} value={wallet.id}>
          {wallet.name}
        </option>
      ))}
    </select>
  );
}
