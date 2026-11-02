import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-center py-4 text-xs sm:text-sm text-cinema-muted">
        Showing all {totalItems} movies
      </div>
    );
  }

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <nav
      aria-label="Movie list pagination"
      className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-cinema-border/60', className)}
    >
      <div className="text-xs sm:text-sm text-cinema-muted order-2 sm:order-1">
        Showing <span className="font-semibold text-cinema-text">{startItem}</span> to{' '}
        <span className="font-semibold text-cinema-text">{endItem}</span> of{' '}
        <span className="font-semibold text-cinema-text">{totalItems}</span> movies
      </div>

      <div className="flex items-center gap-1.5 order-1 sm:order-2">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
          className="flex items-center justify-center p-2 min-w-[44px] min-h-[44px] rounded-btn bg-cinema-surface border border-cinema-border text-cinema-text hover:bg-cinema-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Buttons */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-cinema-muted select-none"
              >
                …
              </span>
            );
          }
          const pageNum = Number(p);
          const isCurrent = pageNum === currentPage;
          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center min-w-[44px] min-h-[44px] px-3.5 text-sm font-semibold rounded-btn transition-colors',
                isCurrent
                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                  : 'bg-cinema-surface border border-cinema-border text-cinema-muted hover:text-white hover:bg-cinema-hover'
              )}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
          className="flex items-center justify-center p-2 min-w-[44px] min-h-[44px] rounded-btn bg-cinema-surface border border-cinema-border text-cinema-text hover:bg-cinema-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
