'use client';

import { type InputHTMLAttributes } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function TextInput({
  label,
  error,
  className = '',
  id,
  ...props
}: TextInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1 ${
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-300' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
