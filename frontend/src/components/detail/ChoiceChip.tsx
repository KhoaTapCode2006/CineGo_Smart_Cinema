import React from 'react';
import { cn } from '../../utils/cn';

interface ChoiceChipProps {
  label: string;
  isSelected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export const ChoiceChip: React.FC<ChoiceChipProps> = ({
  label,
  isSelected = false,
  disabled = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected}
      className={cn(
        'h-11 min-w-[88px] px-4 py-2.5 rounded-btn text-left text-sm font-medium text-cinema-text whitespace-nowrap transition-all duration-200',
        isSelected ? 'bg-brand' : 'bg-cinema-raised',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:brightness-125'
      )}
    >
      {label}
    </button>
  );
};

export default ChoiceChip;
