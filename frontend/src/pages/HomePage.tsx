import React from 'react';
import Navbar from '../components/layout/Navbar';
import HeroSlider from '../components/hero/HeroSlider';
import MovieDiscovery from '../components/discovery/MovieDiscovery';
import Footer from '../components/layout/Footer';
import { useFeaturedMovies } from '../hooks/useMovies';
import { Movie } from '../types/movie';

export const HomePage: React.FC = () => {
  const { data: featuredMovies = [], isLoading, isError, refetch } = useFeaturedMovies();

  const handleBookNow = (movie: Movie) => {
    // Smoothly scroll down to discovery section or navigate to movie detail
    const el = document.getElementById('discovery');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-cinema-bg text-cinema-text flex flex-col">
      {/* Top Sticky Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1">
        {/* Section A: Hero Slider */}
        <HeroSlider
          movies={featuredMovies}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onBookNow={handleBookNow}
        />

        {/* Section B: Movie Discovery (Browse, Search, Filter, Pagination) */}
        <MovieDiscovery onBookNow={handleBookNow} />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;
