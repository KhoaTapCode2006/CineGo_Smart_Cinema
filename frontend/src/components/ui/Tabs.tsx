import React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      const nextIndex = (index + 1) % tabs.length;
      onChange(tabs[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      onChange(tabs[prevIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Movie status tabs"
      className={cn('flex items-center gap-6 border-b border-white/10', className)}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`tabpanel-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'relative py-3.5 px-1 min-h-[44px] flex items-center gap-2 text-base font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:text-brand',
              isActive
                ? 'text-white font-bold [text-shadow:_0_1px_3px_rgba(0,0,0,0.8)]'
                : 'text-slate-300 hover:text-white [text-shadow:_0_1px_2px_rgba(0,0,0,0.7)]'
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full font-medium transition-colors',
                  isActive
                    ? 'bg-brand/20 text-brand-300 border border-brand/40'
                    : 'bg-white/5 border border-white/10 text-slate-300'
                )}
              >
                {tab.count}
              </span>
            )}
            {/* Active underline indicator */}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full shadow-[0_0_8px_rgba(229,9,20,0.8)]"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
