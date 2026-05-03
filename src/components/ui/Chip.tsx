'use client';

interface ChipProps {
  label: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function Chip({
  label,
  description,
  selected = false,
  disabled = false,
  onClick,
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`w-full rounded-lg border-2 p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        selected
          ? 'border-zinc-900 bg-zinc-50'
          : 'border-zinc-200 bg-white hover:border-zinc-400'
      }`}
    >
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      {description && (
        <span className="mt-1 block text-xs text-zinc-500">{description}</span>
      )}
    </button>
  );
}
