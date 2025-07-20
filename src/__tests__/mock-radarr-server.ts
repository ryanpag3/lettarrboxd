import express from 'express';
import { Server } from 'http';

export interface MockRadarrServer {
  server: Server;
  port: number;
  close: () => Promise<void>;
}

export function createMockRadarrServer(port: number = 0): Promise<MockRadarrServer> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json());

    // Mock data
    const mockQualityProfiles = [
      { id: 1, name: 'SD' },
      { id: 2, name: 'HD-1080p' },
      { id: 3, name: '4K' }
    ];

    const mockRootFolders = [
      { id: 1, path: '/movies' },
      { id: 2, path: '/movies-4k' }
    ];

    const mockTags = [
      { id: 1, label: 'existing-tag' }
    ];

    const mockMovies: any[] = [];
    let nextMovieId = 1;
    let nextTagId = 2;

    // API endpoints
    app.get('/api/v3/movie/lookup/tmdb', (req, res) => {
      const tmdbId = req.query.tmdbId as string;
      
      if (tmdbId === '12345') {
        res.json({
          title: 'Test Movie',
          year: 2023,
          tmdbId: parseInt(tmdbId),
          runtime: 120,
          overview: 'A test movie for integration tests'
        });
      } else if (tmdbId === '67890') {
        res.json({
          title: 'Another Test Movie',
          year: 2022,
          tmdbId: parseInt(tmdbId),
          runtime: 90,
          overview: 'Another test movie'
        });
      } else {
        res.status(404).json({ error: 'Movie not found' });
      }
    });

    app.get('/api/v3/movie', (req, res) => {
      const tmdbId = req.query.tmdbId as string;
      
      if (tmdbId) {
        const existingMovie = mockMovies.find(m => m.tmdbId === parseInt(tmdbId));
        res.json(existingMovie ? [existingMovie] : []);
      } else {
        res.json(mockMovies);
      }
    });

    app.get('/api/v3/qualityprofile', (req, res) => {
      res.json(mockQualityProfiles);
    });

    app.get('/api/v3/rootfolder', (req, res) => {
      res.json(mockRootFolders);
    });

    app.get('/api/v3/tag', (req, res) => {
      res.json(mockTags);
    });

    app.post('/api/v3/tag', (req, res) => {
      const { label } = req.body;
      const newTag = { id: nextTagId++, label };
      mockTags.push(newTag);
      res.status(201).json(newTag);
    });

    app.post('/api/v3/movie', (req, res) => {
      const movieData = req.body;
      const newMovie = {
        id: nextMovieId++,
        ...movieData,
        hasFile: false,
        monitored: true,
        status: 'announced'
      };
      mockMovies.push(newMovie);
      res.status(201).json(newMovie);
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', movies: mockMovies.length });
    });

    const server = app.listen(port, () => {
      const actualPort = (server.address() as any)?.port || port;
      console.log(`Mock Radarr server listening on port ${actualPort}`);
      
      resolve({
        server,
        port: actualPort,
        close: () => {
          return new Promise((resolve) => {
            server.close(() => resolve());
          });
        }
      });
    });

    server.on('error', reject);
  });
}