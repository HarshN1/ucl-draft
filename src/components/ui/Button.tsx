'use client';

import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={clsx(
        'font-display font-semibold tracking-wide transition-all duration-200 rounded border',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        {
          // Primary
          'bg-accent/10 border-accent text-accent hover:bg-accent hover:text-background glow-accent':
            variant === 'primary' && !disabled,
          // Ghost
          'bg-transparent border-white/30 text-white/80 hover:border-white hover:text-white':
            variant === 'ghost' && !disabled,
          // Danger
          'bg-ucl-red/10 border-ucl-red text-ucl-red hover:bg-ucl-red hover:text-white':
            variant === 'danger' && !disabled,
          // Gold
          'bg-gold/10 border-gold text-gold hover:bg-gold hover:text-background glow-gold':
            variant === 'gold' && !disabled,
          // Sizes
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-5 py-2.5 text-base': size === 'md',
          'px-8 py-3.5 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
