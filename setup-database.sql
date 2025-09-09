-- Create database and table for movie catalog
CREATE DATABASE IF NOT EXISTS movies_db;
USE movies_db;

CREATE TABLE IF NOT EXISTS movies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  director VARCHAR(255) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  release_year INT NOT NULL,
  rating DECIMAL(3,1) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data
INSERT IGNORE INTO movies (id, title, director, genre, release_year, rating) VALUES
(1, 'The Shawshank Redemption', 'Frank Darabont', 'Drama', 1994, 9.3),
(2, 'The Godfather', 'Francis Ford Coppola', 'Drama', 1972, 9.2),
(3, 'The Dark Knight', 'Christopher Nolan', 'Action', 2008, 9.0),
(4, 'Pulp Fiction', 'Quentin Tarantino', 'Drama', 1994, 8.9),
(5, 'Forrest Gump', 'Robert Zemeckis', 'Drama', 1994, 8.8);

SELECT * FROM movies;
