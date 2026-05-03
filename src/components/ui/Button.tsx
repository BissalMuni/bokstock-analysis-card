'use client';

import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({
  variant = 'primary',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-700 focus:ring-zinc-500',
    secondary:
      'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 focus:ring-zinc-400',
    ghost: 'text-zinc-600 hover:bg-zinc-100 focus:ring-zinc-300',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
