import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOVIE_NOT_FOUND } from '../api/catalog';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AmbientEffects from '../components/effects/AmbientEffects';
import MovieHero from '../components/detail/MovieHero';
import ShowtimePicker from '../components/detail/ShowtimePicker';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { MovieDetailSkeleton } from '../components/ui/Skeletons';
import { useMovieDetail } from '../hooks/useMovies';

export const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: movie, isLoading, error, refetch } = useMovieDetail(id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  return (
    <div className="relative min-h-screen bg-transparent text-cinema-text flex flex-col overflow-x-clip">
      {/* Same ambient background as the Home page */}
      <AmbientEffects
        galaxy={{ nebulaOpacity: 1, starOpacity: 1 }}
        shootingStars={{ count: 6, angle: 32 }}
        cursorGlow={{ redOpacity: 0.08, indigoOpacity: 0.07, size: 520, easing: 0.08 }}
      />

      <Navbar />

      <main className="relative z-10 flex-1">
        {isLoading ? (
          <MovieDetailSkeleton />
        ) : movie ? (
          <>
            <MovieHero movie={movie} />
            <ShowtimePicker movie={movie} />
          </>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
            {error?.message === MOVIE_NOT_FOUND ? (
              <EmptyState
                type="search"
                title="Movie not found"
                description="This movie doesn't exist or is no longer showing."
                actionText="Back to Home"
                onAction={() => navigate('/')}
              />
            ) : (
              <ErrorState
                title="Couldn't load this movie"
                message="Something went wrong while contacting the server. Please try again."
                retryText="Retry"
                onRetry={() => refetch()}
              />
            )}
          </div>
        )}
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default MovieDetailPage;
