'use client';

import { Dialog } from '@headlessui/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export default function Modal({ isOpen, onClose, title, description }: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
    >
      <Dialog.Panel className="bg-white rounded-lg max-w-sm w-full p-6 shadow-lg border border-gray-300">
        <Dialog.Title className="text-lg font-semibold mb-2">{title}</Dialog.Title>
        <Dialog.Description className="text-sm mb-6 text-gray-700">{description}</Dialog.Description>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            OK
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}
