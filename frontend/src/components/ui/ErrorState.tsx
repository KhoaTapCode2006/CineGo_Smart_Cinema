import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ErrorStateProps {
  title?: string;
  message?: string;
  retryText?: string;
  onRetry: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Connection Error',
  message = 'Unable to connect to CineGo API server. Please check your backend connection or CORS settings.',
  retryText = 'Retry Connection',
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-10 text-center bg-brand/5 border border-brand/30 rounded-card my-8',
        className
      )}
    >
      <div className="w-14 h-14 mb-4 rounded-full bg-brand/10 flex items-center justify-center text-brand">
        <AlertTriangle className="w-7 h-7" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>

      <p className="text-sm text-cinema-muted max-w-lg mb-6 leading-relaxed">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] bg-brand hover:bg-brand-600 text-white font-semibold text-sm rounded-btn shadow-lg shadow-brand/25 transition-all duration-200"
      >
        <RefreshCw className="w-4 h-4" />
        <span>{retryText}</span>
      </button>
    </div>
  );
};

export default ErrorState;
