import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOVIE_NOT_FOUND } from '../api/catalog';
import DetailFooter from '../components/detail/DetailFooter';
import DetailHeader from '../components/detail/DetailHeader';
import MovieIntro from '../components/detail/MovieIntro';
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
    <div className="min-h-screen flex flex-col pb-16 md:pb-0 bg-cinema-bg text-cinema-text">
      <DetailHeader />

      <main className="flex-1 flex flex-col items-start gap-6 w-full max-w-[1440px] mx-auto px-4 pt-6 pb-8 md:px-16 md:py-8">
        {isLoading ? (
          <MovieDetailSkeleton />
        ) : movie ? (
          <>
            <MovieIntro movie={movie} />
            <ShowtimePicker movie={movie} />
          </>
        ) : error?.message === MOVIE_NOT_FOUND ? (
          <EmptyState
            title="Không tìm thấy phim"
            description="Phim này không tồn tại hoặc đã ngừng chiếu."
            actionText="Về trang chủ"
            onAction={() => navigate('/')}
            className="w-full my-0"
          />
        ) : (
          <ErrorState
            title="Không tải được phim"
            message="Đã có lỗi khi kết nối tới máy chủ. Vui lòng thử lại."
            retryText="Thử lại"
            onRetry={() => refetch()}
            className="w-full my-0"
          />
        )}
      </main>

      <DetailFooter />
    </div>
  );
};

export default MovieDetailPage;
