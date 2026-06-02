'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  disableBackdropClose?: boolean;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  disableBackdropClose = false,
  children,
  className,
  size = 'md',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (!disableBackdropClose && e.target === overlayRef.current && onClose) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={clsx(
          'relative z-10 bg-primary border border-accent/30 rounded-xl shadow-2xl',
          'animate-fade-in',
          {
            'max-w-sm w-full': size === 'sm',
            'max-w-md w-full': size === 'md',
            'max-w-2xl w-full': size === 'lg',
            'max-w-5xl w-full': size === 'xl',
          },
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
