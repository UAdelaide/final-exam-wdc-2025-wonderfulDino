const express = require('express');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

// getting the id of the user.
app.get('/api/users/me', async (req, res) => {
  try {
    const username = req.cookies.username;

    if (!username) {
        return res.status(400).json({ error: 'No username cookie.' });
    }

    const query = `
        SELECT
            user_id
        FROM
            Users
        WHERE
            Users.username = ?
        `;

    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Error with user query.', err);
            return res.status(500).json({ error: 'Failed to fetch user, database query failed.' });
        }

        res.json(results);

    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch User, code crashed.' });
  }
});

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DogWalkService'
});

// Connecting Database
db.connect((err) => {
    if (err) throw err;
    console.log('Connected to the DogWalkService database');
});

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Login
app.post('/login', (req, res) => {
    console.log('Request Body:', req.body);
    const { username, password } = req.body;

    const query = 'SELECT * FROM Users WHERE username = ? AND password_hash = ?';

    console.log('Username:', username);
    console.log('Password:', password);

    db.query(query, [username, password], (err, results) => {
        if (err) {
            return res.status(500).send('Database error.');
        }

        console.log('Query Results:', results);

        if (results.length === 1) {
            req.session.user = results[0].role;

            // Creating a cookie
            const date = new Date();
            date.setTime(date.getTime() + (604800000)); // 7 days

            res.cookie('username', results[0].username, {
                expires: date,
                httpOnly: true,
                path: '/'
            });

            // Redirecting to a page after being successful.
            if (results[0].role === 'owner') {
                res.sendFile(path.join(__dirname, 'public', 'owner-dashboard.html'));
            } else if (results[0].role === 'walker') {
                res.sendFile(path.join(__dirname, 'public', 'walker-dashboard.html'));
            } else {
                res.send('Error, unknown role.');
            }

        } else {
            res.send('Invalid username or password.');
        }

    });
});

// Logging out
app.get('/logout', (req, res) => {

    res.clearCookie('username');

    req.session.destroy((err) => {
        if (err) {
            return res.send('Error logging out');
        }
        res.redirect('/');
    });
});

// getting dog list
app.get('/dogList', async (req, res) => {
  try {
    const username = req.cookies.username;

    if (!username) {
        return res.status(400).json({ error: 'No username cookie.' });
    }

    const query = `
        SELECT
            Dogs.name AS dog_name,
            Dogs.dog_id AS dog_id,
            Dogs.size AS size,
            Users.username AS owner_name
        FROM
            Dogs
        JOIN
            Users ON Dogs.owner_id = Users.user_id
        WHERE
            Users.username = ?
        `;

    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Error with dogList query.', err);
            return res.status(500).json({ error: 'Failed to fetch dogs, database query failed.' });
        }

        res.json(results);

    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Dogs, code crashed.' });
  }
});


// All the dogs
// Return a list of all dogs with their size and owner's username.
app.get('/api/dogs', async (req, res) => {
  try {

        const query = `
        SELECT
            Dogs.name AS dog_name,
            Dogs.size AS size,
            Users.username AS owner_name
        FROM
            Dogs
        JOIN
            Users ON Dogs.owner_id = Users.user_id
        `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error with dogList query.', err);
            return res.status(500).json({ error: 'Failed to fetch dogs, database query failed.' });
        }

        res.json(results);

    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Dogs' });
  }
});

// return a random dog image
app.get('/api/dog-image', async (req, res) => {
  try {
    const response = await fetch("https://dog.ceo/api/breeds/image/random", {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });


    const data = await response.json();

    if (data.status !== "success") {
      // Log error or handle as you prefer
      return res.status(data.error.status || 500).json({ error: data.error.message || "API Error." });
    }

    // Send JSON response directly to client
    res.json(data);

  } catch (err) {
    console.error("Error in /api/dog-image:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Export the app instead of listening here
module.exports = app;
