var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Set your MySQL root password
    });

    // Create the database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // Now connect to the created database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    // Create a table if it doesn't exist
 /*   await db.execute(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        author VARCHAR(255)
      )
    `);*/

    // Insert data if table is empty
    const [rows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (rows[0].count === 0) {
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role)
        VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('johnsteven', 'john@example.com', 'hashed0123', 'walker'),
        ('mrveryreal', 'real@example.com', 'hashed4567', 'owner')
      `);

      await db.execute(`
        INSERT INTO Dogs (owner_id, name, size)
        SELECT user_id, 'Max', 'medium' FROM Users
        WHERE username='alice123'
      `);

      await db.execute(`
        INSERT INTO Dogs (owner_id, name, size)
        SELECT user_id, 'Bella', 'small' FROM Users
        WHERE username='carol123'
      `);

      await db.execute(`
        INSERT INTO Dogs (owner_id, name, size)
        SELECT user_id, 'Doggy', 'large' FROM Users
        WHERE username='johnsteven'
      `);

      await db.execute(`
        INSERT INTO Dogs (owner_id, name, size)
        SELECT user_id, 'Bob', 'small' FROM Users
        WHERE username='bobwalker'
      `);

      await db.execute(`
        INSERT INTO Dogs (owner_id, name, size)
        SELECT user_id, 'Eric', 'medium' FROM Users
        WHERE username='mrveryreal'
      `);

      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        SELECT dog_id, '2025-06-10 08:00:00', 30, 'Parklands', 'open' FROM Dogs
        WHERE name='Max'
      `);

      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        SELECT dog_id, '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted' FROM Dogs
        WHERE name='Bella'
      `);

      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        SELECT dog_id, '2025-01-10 10:30:00', 15, 'True Street', 'completed' FROM Dogs
        WHERE name='Eric'
      `);

      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        SELECT dog_id, '2025-08-10 10:30:00', 60, 'Street Road', 'cancelled' FROM Dogs
        WHERE name='Doggy'
      `);

      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        SELECT dog_id, '2025-10-10 10:30:00', 60, 'Street Road', 'open' FROM Dogs
        WHERE name='Doggy'
      `);
    }
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

// Route to return users as JSON
app.get('/', async (req, res) => {
  try {
    const [users] = await db.execute('SELECT * FROM Users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Users' });
  }
});

// Return a list of all dogs with their size and owner's username.
app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute(`
        SELECT
            Dogs.name AS dog_name,
            Dogs.size AS size,
            Users.username AS owner_name
        FROM
            Dogs
        JOIN
            Users ON Dogs.owner_id = Users.user_id
    `);
    res.json(dogs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Dogs' });
  }
});

// Return all open walk requests, including the dog name, requested time, location, and owner's username.
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [walkrequests] = await db.execute(`
        SELECT
            WalkRequests.request_id AS request_id,
            Dogs.name AS dog_name,
            WalkRequests.requested_time AS requested_time,
            WalkRequests.duration_minutes AS duration_minutes,
            WalkRequests.location AS location,
            Users.username AS owner_username
        FROM
            WalkRequests
        JOIN
            Dogs ON WalkRequests.dog_id = Dogs.dog_id
        JOIN
            Users ON Dogs.owner_id = Users.user_id
        WHERE
            WalkRequests.status = 'open'
    `);
    res.json(walkrequests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walkrequests' });
  }
});

// Return a summary of each walker with their average rating and number of completed walks.
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [walkrequests] = await db.execute(`
        SELECT
            WalkRequests.request_id AS request_id,
            Dogs.name AS dog_name,
            WalkRequests.requested_time AS requested_time,
            WalkRequests.duration_minutes AS duration_minutes,
            WalkRequests.location AS location,
            Users.username AS owner_username
        FROM
            WalkRequests
        JOIN
            Dogs ON WalkRequests.dog_id = Dogs.dog_id
        JOIN
            Users ON Dogs.owner_id = Users.user_id
        WHERE
            WalkRequests.status = 'open'
    `);
    res.json(walkrequests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walkrequests' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
