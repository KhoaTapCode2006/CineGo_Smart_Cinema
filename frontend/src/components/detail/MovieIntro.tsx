import React, { useRef, useState } from 'react';
import { Movie, formatLanguage } from '../../types/movie';
import TrailerModal from '../ui/TrailerModal';
import DetailPanel from './DetailPanel';
import abstractHorizon from '../../assets/abstract-horizon.svg';

interface MovieIntroProps {
  movie: Movie;
}

export const MovieIntro: React.FC<MovieIntroProps> = ({ movie }) => {
  const [posterError, setPosterError] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const trailerTriggerRef = useRef<HTMLElement | null>(null);

  const hasPoster = Boolean(movie.posterUrl) && !posterError;
  const metaLine = [
    movie.ageRating,
    movie.genre,
    movie.durationMinutes > 0 ? `${movie.durationMinutes} phút` : null,
    movie.language ? formatLanguage(movie.language, 'vi') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleCloseTrailer = () => {
    setIsTrailerOpen(false);
    trailerTriggerRef.current?.focus();
  };

  return (
    <div className="flex items-start gap-8 w-full">
      {/* Poster, or the abstract film artwork when the movie has none */}
      <div className="flex-1 md:flex-none min-w-0 md:w-[280px] h-[280px] md:h-[340px] rounded-xl overflow-hidden">
        {hasPoster ? (
          <img
            src={movie.posterUrl!}
            alt={movie.title}
            onError={() => setPosterError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col justify-between h-full p-6 bg-gradient-to-r from-[#586175] via-[#2d344b] via-[48%] to-[#141827]">
            <p className="text-xs text-cinema-text">CINEGO ORIGINAL STORIES</p>
            <div className="relative h-20 w-[180px] max-w-full">
              <div className="absolute inset-[-0.84%_-0.18%_-0.47%_-0.18%]">
                <img src={abstractHorizon} alt="" className="block max-w-none w-full h-full" />
              </div>
            </div>
            <p className="text-[32px] leading-10 font-bold text-cinema-text line-clamp-2">
              {movie.title}
            </p>
          </div>
        )}
      </div>

      {/* Film Information */}
      <div className="flex-1 min-w-0 flex flex-col gap-5 break-words">
        <p className="text-xs text-accent-gold">
          CINEGO / {movie.status === 'coming_soon' ? 'SẮP CHIẾU' : 'ĐANG CHIẾU'}
        </p>
        <h1 className="text-[32px] leading-10 font-bold text-cinema-text">{movie.title}</h1>
        {metaLine && <p className="text-base text-cinema-soft">{metaLine}</p>}
        {movie.description && <p className="text-base text-cinema-text">{movie.description}</p>}

        {(movie.director || movie.castList.length > 0) && (
          <div className="text-sm font-medium text-cinema-soft">
            {movie.director && <p>Đạo diễn: {movie.director}</p>}
            {movie.castList.length > 0 && <p>Diễn viên: {movie.castList.join(', ')}</p>}
          </div>
        )}

        {movie.trailerEmbedUrl ? (
          <DetailPanel
            onClick={(e) => {
              trailerTriggerRef.current = e.currentTarget;
              setIsTrailerOpen(true);
            }}
          >
            <span className="text-xl font-semibold text-cinema-text">▷ Xem trailer</span>
            <span className="text-sm font-medium text-cinema-soft">
              Phát trailer chính thức của phim trên YouTube.
            </span>
          </DetailPanel>
        ) : (
          <DetailPanel>
            <p className="text-xl font-semibold text-cinema-text">▷ Trailer minh họa</p>
            <p className="text-sm font-medium text-cinema-soft">
              Khung xem tĩnh · Không có video hoặc nội dung có bản quyền.
            </p>
          </DetailPanel>
        )}
      </div>

      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={handleCloseTrailer}
        videoTitle={movie.title}
        embedUrl={movie.trailerEmbedUrl}
      />
    </div>
  );
};

export default MovieIntro;
