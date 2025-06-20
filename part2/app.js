const express = require('express');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.urlencoded({ extended: true }));
// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DogWalkService'
});

// Connecting Database
db.connect(err => {
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

    const query = `
    SELECT
        Dogs.name AS dog_name,
        Dogs.size AS size,
        Users.username AS owner_name
    FROM
        Dogs
    JOIN
        Users ON Dogs.owner_id = Users.user_id
    WHERE
        Users.username = '?'
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error with dogList query.', err);
            return res.status(500).json({ error: 'Failed to fetch dogs' });
        }

        res.json(results);

    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Dogs' });
  }
});


// Export the app instead of listening here
module.exports = app;
