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

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Error logging out');
        }
        res.send('Logged out successfully');
    });
});

// Export the app instead of listening here
module.exports = app;
