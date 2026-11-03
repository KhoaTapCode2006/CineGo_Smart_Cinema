import React from 'react';
import { cn } from '../../utils/cn';

interface DetailPanelProps {
  children: React.ReactNode;
  /** Turns the whole panel into a button. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ children, onClick }) => {
  const panelClasses =
    'flex flex-col gap-4 w-full min-w-0 p-6 rounded-card bg-cinema-surface border border-cinema-outline';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          panelClasses,
          'text-left cursor-pointer transition-colors duration-200 hover:border-cinema-soft/60 hover:bg-cinema-hover'
        )}
      >
        {children}
      </button>
    );
  }

  return <div className={panelClasses}>{children}</div>;
};

export default DetailPanel;
