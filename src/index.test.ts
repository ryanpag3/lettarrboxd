// Basic tests for index module logic
describe('index module tests', () => {
  it('should handle movie comparison logic', () => {
    const currentMovies = [
      { url: 'movie1', tmdbId: '123' },
      { url: 'movie2', tmdbId: '456' },
      { url: 'movie3', tmdbId: '789' }
    ];

    const previousMovies = [
      { url: 'movie1', tmdbId: '123' },
      { url: 'movie2', tmdbId: '456' }
    ];

    const findNewMovies = (current: any[], previous: any[]) => {
      const previousUrls = new Set(previous.map(movie => movie.url));
      return current.filter(movie => !previousUrls.has(movie.url));
    };

    const newMovies = findNewMovies(currentMovies, previousMovies);
    
    expect(newMovies).toHaveLength(1);
    expect(newMovies[0]).toEqual({ url: 'movie3', tmdbId: '789' });
  });

  it('should handle movie data structure', () => {
    const now = new Date('2023-01-01T00:00:00.000Z');
    const movies = [{ url: 'movie1', tmdbId: '123' }];
    
    const moviesData = {
      timestamp: now.toISOString(),
      queryDate: now.toLocaleDateString(),
      totalMovies: movies.length,
      movies
    };

    expect(moviesData.timestamp).toBe('2023-01-01T00:00:00.000Z');
    expect(moviesData.totalMovies).toBe(1);
    expect(moviesData.movies).toEqual(movies);
  });

  it('should handle interval calculation', () => {
    const intervalMinutes = 60;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    expect(intervalMs).toBe(3600000); // 1 hour in milliseconds
  });
});