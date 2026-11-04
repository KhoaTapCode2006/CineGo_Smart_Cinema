import React from 'react';
import { Film, SearchX, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  type?: 'search' | 'now_showing' | 'general';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'general',
  title,
  description,
  actionText,
  onAction,
  className,
}) => {
  let defaultTitle = 'No movies found';
  let defaultDesc = 'Try adjusting your search query or selecting a different genre.';
  let defaultAction = 'Clear all filters';
  let Icon = SearchX;

  if (type === 'now_showing') {
    defaultTitle = 'No movies are currently showing';
    defaultDesc = 'We are updating our schedule. Check out upcoming movies in Coming Soon!';
    defaultAction = 'Explore Coming Soon';
    Icon = Film;
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-cinema-surface/50 border border-cinema-border/60 rounded-card my-8',
        className
      )}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-full bg-cinema-card flex items-center justify-center border border-cinema-border text-cinema-muted">
        <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-brand/80" aria-hidden="true" />
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-cinema-text mb-2">
        {title || defaultTitle}
      </h3>

      <p className="text-sm text-cinema-muted max-w-md mb-6 leading-relaxed">
        {description || defaultDesc}
      </p>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-cinema-card hover:bg-cinema-hover text-cinema-text font-medium text-sm rounded-btn border border-cinema-border hover:border-cinema-muted/50 transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4 text-brand" />
          <span>{actionText || defaultAction}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;
