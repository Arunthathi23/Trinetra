import { ReactNode } from 'react';

type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-800/90 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 transition hover:text-white">Close</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
