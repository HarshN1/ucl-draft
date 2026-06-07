'use client';

import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * EA-style "metro" button: a hard-angled parallelogram (skewX -12°) with its
 * label un-skewed so the text stays upright. Active/hover states snap to a
 * high-saturation fill + outer glow rather than a soft transition.
 */
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
        'ea-skew group relative font-display font-semibold uppercase tracking-[0.08em]',
        'border-2 transition-[box-shadow,background-color,color,transform] duration-75 ease-out',
        'focus:outline-none active:translate-y-px',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        {
          'border-gold text-gold bg-gold/10 hover:bg-gold hover:text-background hover:glow-gold':
            variant === 'primary' && !disabled,
          'border-white/35 text-white/85 bg-white/5 hover:border-lime hover:text-lime hover:glow-lime':
            variant === 'ghost' && !disabled,
          'border-ucl-red text-ucl-red bg-ucl-red/10 hover:bg-ucl-red hover:text-white':
            variant === 'danger' && !disabled,
          'border-lime text-lime bg-lime/10 hover:bg-lime hover:text-background hover:glow-lime':
            variant === 'gold' && !disabled,
          'px-4 py-1.5 text-sm': size === 'sm',
          'px-7 py-2.5 text-base': size === 'md',
          'px-10 py-3.5 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      <span className="ea-unskew block">{children}</span>
    </button>
  );
}
