// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Movie } from '../types/movie';
import { computePopupPosition, useMoviePreview } from './useMoviePreview';

const movie = (id: string) => ({ id, title: id }) as Movie;
const anchor = document.createElement('div');

describe('useMoviePreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('opens only after the cursor rests on a card', () => {
    const { result } = renderHook(() => useMoviePreview());

    act(() => result.current.open(movie('a'), anchor));
    expect(result.current.preview).toBeNull();

    act(() => vi.advanceTimersByTime(400));
    expect(result.current.preview?.movie.id).toBe('a');
  });

  it('does not open when the cursor just passes over a card', () => {
    const { result } = renderHook(() => useMoviePreview());

    act(() => result.current.open(movie('a'), anchor));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.close());
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.preview).toBeNull();
  });

  it('stays open when the cursor moves from the card into the popup', () => {
    const { result } = renderHook(() => useMoviePreview());

    act(() => result.current.open(movie('a'), anchor));
    act(() => vi.advanceTimersByTime(400));
    act(() => result.current.close());
    act(() => vi.advanceTimersByTime(50));
    act(() => result.current.keepOpen());
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.preview?.movie.id).toBe('a');
  });

  it('closes after the cursor leaves', () => {
    const { result } = renderHook(() => useMoviePreview());

    act(() => result.current.open(movie('a'), anchor));
    act(() => vi.advanceTimersByTime(400));
    act(() => result.current.close());
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.preview).toBeNull();
  });

  it('switches to the next card faster than the first open', () => {
    const { result } = renderHook(() => useMoviePreview());

    act(() => result.current.open(movie('a'), anchor));
    act(() => vi.advanceTimersByTime(400));
    act(() => result.current.open(movie('b'), anchor));
    act(() => vi.advanceTimersByTime(150));

    expect(result.current.preview?.movie.id).toBe('b');
  });

  it('dismisses immediately and cancels anything pending', () => {
    const { result } = renderHook(() => useMoviePreview());

    act(() => result.current.open(movie('a'), anchor));
    act(() => vi.advanceTimersByTime(400));
    act(() => result.current.open(movie('b'), anchor));
    act(() => result.current.dismiss());
    expect(result.current.preview).toBeNull();

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.preview).toBeNull();
  });
});

describe('computePopupPosition', () => {
  const viewport = { width: 1440, height: 900 };
  const popup = { width: 340, height: 420 };
  const rect = (left: number, top: number, width = 190, height = 340) =>
    ({ left, top, width, height }) as DOMRect;

  it('centers the popup over the card', () => {
    expect(computePopupPosition(rect(600, 300), popup, viewport)).toEqual({ left: 525, top: 260 });
  });

  it('keeps the popup inside the left and right edges', () => {
    expect(computePopupPosition(rect(10, 300), popup, viewport).left).toBe(12);
    expect(computePopupPosition(rect(1240, 300), popup, viewport).left).toBe(1088);
  });

  it('stays below the navbar and above the bottom edge', () => {
    expect(computePopupPosition(rect(600, -200), popup, viewport).top).toBe(76);
    expect(computePopupPosition(rect(600, 800), popup, viewport).top).toBe(468);
  });

  it('prefers the navbar edge when the popup is taller than the space', () => {
    const short = { width: 1440, height: 300 };
    expect(computePopupPosition(rect(600, 100), popup, short).top).toBe(76);
  });
});
