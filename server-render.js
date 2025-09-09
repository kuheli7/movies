const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database configuration - supports both MySQL and PostgreSQL
let db;
let isPostgreSQL = false;

async function initDatabase() {
  console.log('🔧 Environment variables:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set');
  console.log('DB_TYPE:', process.env.DB_TYPE);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  
  // Check if we're using PostgreSQL (Render environment)
  if (process.env.DATABASE_URL || process.env.DB_TYPE === 'postgresql') {
    console.log('🐘 Connecting to PostgreSQL...');
    const { Pool } = require('pg');
    
    try {
      // Configure PostgreSQL connection
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      db = pool;
      isPostgreSQL = true;
      
      // Test the connection
      await db.query('SELECT NOW()');
      console.log('✅ PostgreSQL connection test successful!');
      
      // Create table if it doesn't exist
      await createPostgreSQLTable();
      console.log('✅ Connected to PostgreSQL successfully!');
      
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
    
  } else {
    console.log('🐬 Connecting to MySQL...');
    const mysql = require('mysql2');
    
    // Configure MySQL connection (for local development)
    db = mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'movies_db'
    });
    
    console.log('✅ Connected to MySQL successfully!');
  }
}

// Create PostgreSQL table
async function createPostgreSQLTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        director VARCHAR(255) NOT NULL,
        genre VARCHAR(100) NOT NULL,
        release_year INTEGER NOT NULL,
        rating DECIMAL(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 10)
      )
    `);
    
    // Check if table is empty and add sample data
    const result = await db.query('SELECT COUNT(*) FROM movies');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      console.log('📊 Adding sample data to PostgreSQL...');
      await addSampleDataPostgreSQL();
    }
  } catch (error) {
    console.error('❌ Error creating PostgreSQL table:', error);
  }
}

// Add sample data for PostgreSQL
async function addSampleDataPostgreSQL() {
  const sampleMovies = [
    ['The Shawshank Redemption', 'Frank Darabont', 'Drama', 1994, 9.3],
    ['The Godfather', 'Francis Ford Coppola', 'Drama', 1972, 9.2],
    ['The Dark Knight', 'Christopher Nolan', 'Action', 2008, 9.0],
    ['Pulp Fiction', 'Quentin Tarantino', 'Drama', 1994, 8.9],
    ['Forrest Gump', 'Robert Zemeckis', 'Drama', 1994, 8.8],
    ['Inception', 'Christopher Nolan', 'Sci-Fi', 2010, 8.7],
    ['The Matrix', 'The Wachowskis', 'Sci-Fi', 1999, 8.7],
    ['Goodfellas', 'Martin Scorsese', 'Drama', 1990, 8.7],
    ['The Lord of the Rings: The Fellowship of the Ring', 'Peter Jackson', 'Adventure', 2001, 8.8],
    ['Star Wars: Episode IV - A New Hope', 'George Lucas', 'Sci-Fi', 1977, 8.6]
  ];

  for (const movie of sampleMovies) {
    await db.query(
      'INSERT INTO movies (title, director, genre, release_year, rating) VALUES ($1, $2, $3, $4, $5)',
      movie
    );
  }
}

// Execute query with database-specific syntax
function executeQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgreSQL) {
      // PostgreSQL uses $1, $2, etc. for parameters
      db.query(query, params)
        .then(result => resolve({ rows: result.rows, affectedRows: result.rowCount }))
        .catch(reject);
    } else {
      // MySQL uses ? for parameters
      db.query(query, params, (err, results) => {
        if (err) reject(err);
        else resolve({ rows: results, affectedRows: results.affectedRows });
      });
    }
  });
}

// API Routes

// GET /api/movies - Retrieve all movies
app.get('/api/movies', async (req, res) => {
  console.log('Getting all movies...');
  try {
    const query = isPostgreSQL ? 
      'SELECT * FROM movies ORDER BY id DESC' : 
      'SELECT * FROM movies ORDER BY id DESC';
    
    const result = await executeQuery(query);
    const movies = isPostgreSQL ? result.rows : result.rows;
    
    res.json({
      success: true,
      data: movies,
      count: movies.length
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// POST /api/movies - Add a new movie
app.post('/api/movies', async (req, res) => {
  const { title, director, genre, release_year, rating } = req.body;
  
  if (!title || !director || !genre || !release_year || !rating) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }
  
  try {
    const query = isPostgreSQL ?
      'INSERT INTO movies (title, director, genre, release_year, rating) VALUES ($1, $2, $3, $4, $5) RETURNING id' :
      'INSERT INTO movies (title, director, genre, release_year, rating) VALUES (?, ?, ?, ?, ?)';
    
    const result = await executeQuery(query, [title, director, genre, release_year, rating]);
    const insertId = isPostgreSQL ? result.rows[0].id : result.rows.insertId;
    
    res.status(201).json({
      success: true,
      message: 'Movie added successfully!',
      data: { id: insertId, title, director, genre, release_year, rating }
    });
  } catch (error) {
    console.error('Insert error:', error);
    res.status(500).json({ success: false, message: 'Failed to add movie' });
  }
});

// PUT /api/movies/:id - Update an existing movie
app.put('/api/movies/:id', async (req, res) => {
  const { title, director, genre, release_year, rating } = req.body;
  const movieId = req.params.id;
  
  try {
    const query = isPostgreSQL ?
      'UPDATE movies SET title=$1, director=$2, genre=$3, release_year=$4, rating=$5 WHERE id=$6' :
      'UPDATE movies SET title=?, director=?, genre=?, release_year=?, rating=? WHERE id=?';
    
    const result = await executeQuery(query, [title, director, genre, release_year, rating, movieId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    
    res.json({
      success: true,
      message: 'Movie updated successfully!',
      data: { id: movieId, title, director, genre, release_year, rating }
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update movie' });
  }
});

// DELETE /api/movies/:id - Delete a movie
app.delete('/api/movies/:id', async (req, res) => {
  const movieId = req.params.id;
  
  try {
    const query = isPostgreSQL ?
      'DELETE FROM movies WHERE id=$1' :
      'DELETE FROM movies WHERE id=?';
    
    const result = await executeQuery(query, [movieId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    
    res.json({
      success: true,
      message: 'Movie deleted successfully!'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete movie' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: isPostgreSQL ? 'PostgreSQL' : 'MySQL',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Movie Catalog Server...');
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎬 Movie Catalog Server running on port ${PORT}`);
      console.log(`📍 API endpoints: http://localhost:${PORT}/api/movies`);
      console.log(`🌐 Web interface: http://localhost:${PORT}`);
      console.log(`💾 Database: ${isPostgreSQL ? 'PostgreSQL' : 'MySQL'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  if (db && !isPostgreSQL) {
    db.end();
  } else if (db && isPostgreSQL) {
    db.end();
  }
  process.exit(0);
});
