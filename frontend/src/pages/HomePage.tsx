import React from 'react';
import Navbar from '../components/layout/Navbar';
import HeroCarousel from '../components/hero/HeroCarousel';
import MovieDiscovery from '../components/discovery/MovieDiscovery';
import Footer from '../components/layout/Footer';
import AmbientEffects from '../components/effects/AmbientEffects';
import { useFeaturedMovies } from '../hooks/useMovies';
import { Movie } from '../types/movie';

export const HomePage: React.FC = () => {
  const { data: featuredMovies = [], isLoading, isError, refetch } = useFeaturedMovies();

  const handleBookNow = (movie: Movie) => {
    // Smoothly scroll down to discovery section or navigate to movie detail
    const el = document.getElementById('discover') || document.getElementById('discovery');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-cinema-text flex flex-col overflow-x-clip">
      {/* Ambient background effects (Animated Galaxy, Shooting stars, Cursor glow) */}
      <AmbientEffects
        galaxy={{ nebulaOpacity: 1, starOpacity: 1 }}
        shootingStars={{ count: 6, angle: 32 }}
        cursorGlow={{ redOpacity: 0.08, indigoOpacity: 0.07, size: 520, easing: 0.08 }}
      />

      {/* Top Sticky Navbar */}
      <Navbar />

      {/* Main Content (z-10 above background effects) */}
      <main className="relative z-10 flex-1">
        {/* Section A: Cinematic Hero Banner Carousel */}
        <HeroCarousel
          movies={featuredMovies}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onBookNow={handleBookNow}
        />

        {/* Section B: Movie Discovery (Browse, Search, Filter, Pagination) */}
        <MovieDiscovery />
      </main>

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default HomePage;
