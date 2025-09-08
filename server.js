const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();

app.use(express.json(), cors(), express.static('public'));

const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  })
});

require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('Error code:', err.code);
    return;
  }
  console.log('Connected to PostgreSQL successfully');
  release();
  
  // Create users table if it doesn't exist
  const createTableQuery = `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    profilePic VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;
  
  pool.query(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err);
      return;
    }
    console.log('Database ready');
  });
});

const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
};

app.post('/api/register', upload.single('profilePic'), async (req, res) => {
  const { name, email, phone } = req.body;
  const profilePic = req.file?.filename;
  
  if (!name || !email || !phone || !profilePic) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  
  try {
    await dbQuery('INSERT INTO users (name, email, phone, profilePic) VALUES ($1, $2, $3, $4)', 
                  [name, email, phone, profilePic]);
    
    res.json({ 
      success: true, 
      message: 'User registered successfully!' 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await dbQuery('SELECT * FROM users ORDER BY created_at DESC');
    const users = result.rows;
    console.log('Users from database:', users); 
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await dbQuery('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const users = result.rows;
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: users[0] });
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

app.put('/api/users/:id', upload.single('profilePic'), async (req, res) => {
  const { name, email, phone } = req.body;
  const profilePic = req.file?.filename;
  
  try {
    if (profilePic) {
      await dbQuery('UPDATE users SET name=$1, email=$2, phone=$3, profilePic=$4 WHERE id=$5', 
                    [name, email, phone, profilePic, req.params.id]);
    } else {
      await dbQuery('UPDATE users SET name=$1, email=$2, phone=$3 WHERE id=$4', 
                    [name, email, phone, req.params.id]);
    }
    
    res.json({ success: true, message: 'User updated successfully!' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await dbQuery('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'User deleted successfully!' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
