const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

console.log('Starting Movie Catalog Server...');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

require('dotenv').config();

// PostgreSQL connection - exactly like sep_node
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

console.log('Connecting to database...');

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('Error code:', err.code);
    process.exit(1);
  }
  console.log('Connected to PostgreSQL successfully!');
  release();
  
  // Create movies table if it doesn't exist
  const createTableQuery = `CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    director VARCHAR(255) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    release_year INTEGER NOT NULL,
    rating DECIMAL(3,1) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;
  
  pool.query(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err);
      return;
    }
    console.log('Movies table ready');
  });
});

// API Routes
app.get('/api/movies', (req, res) => {
  console.log('Getting all movies...');
  pool.query('SELECT * FROM movies ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({
      success: true,
      data: results.rows,
      count: results.rows.length
    });
  });
});

app.post('/api/movies', (req, res) => {
  const { title, director, genre, release_year, rating } = req.body;
  
  if (!title || !director || !genre || !release_year || !rating) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }
  
  const query = 'INSERT INTO movies (title, director, genre, release_year, rating) VALUES ($1, $2, $3, $4, $5) RETURNING id';
  
  pool.query(query, [title, director, genre, release_year, rating], (err, results) => {
    if (err) {
      console.error('Insert error:', err);
      return res.status(500).json({ success: false, message: 'Failed to add movie' });
    }
    
    res.status(201).json({
      success: true,
      message: 'Movie added successfully!',
      data: { id: results.rows[0].id, title, director, genre, release_year, rating }
    });
  });
});

app.put('/api/movies/:id', (req, res) => {
  const { title, director, genre, release_year, rating } = req.body;
  const movieId = req.params.id;
  
  const query = 'UPDATE movies SET title=?, director=?, genre=?, release_year=?, rating=? WHERE id=?';
  
  db.query(query, [title, director, genre, release_year, rating, movieId], (err, results) => {
    if (err) {
      console.error('Update error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update movie' });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    
    res.json({
      success: true,
      message: 'Movie updated successfully!',
      data: { id: movieId, title, director, genre, release_year, rating }
    });
  });
});

app.delete('/api/movies/:id', (req, res) => {
  const movieId = req.params.id;
  
  db.query('DELETE FROM movies WHERE id=?', [movieId], (err, results) => {
    if (err) {
      console.error('Delete error:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete movie' });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    
    res.json({ success: true, message: 'Movie deleted successfully!' });
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log('Movie Catalog Server running on port', PORT);
  console.log('API endpoints: http://localhost:' + PORT + '/api/movies');
  console.log('Web interface: http://localhost:' + PORT);
  console.log('Database connected with sample movies ready!');
});
