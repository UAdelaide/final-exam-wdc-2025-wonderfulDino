const express = require('express');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

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

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM Users WHERE password_hash = ?';

    db.query(query, [username, password], (err, results) => {
        if (err) {
            return res.status(500).send('Database error.');
        }

        if (results.length > 0) {
            res.send('Logined!');
        } else {
            res.send('Invalid username or password.');
        }

    });
});

// Export the app instead of listening here
module.exports = app;
