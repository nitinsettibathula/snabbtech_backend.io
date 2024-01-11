// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost/your_database_name', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

// Create MongoDB schema for user
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    // Add other user information fields as needed
});

const User = mongoose.model('User', userSchema);

// Middleware to parse JSON
app.use(express.json());

// Register endpoint
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ email: user.email }, 'your_secret_key');
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const nodemailer = require('nodemailer');

// ...

// Forget password endpoint (Send reset link via email)
app.post('/forget-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the user with the provided email exists in the database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate a unique token for password reset (you can use a library like crypto)
        const resetToken = generateResetToken();

        // Save the reset token and its expiration time in the user document
        user.resetToken = resetToken;
        user.resetTokenExpiration = Date.now() + 3600000; // Token valid for 1 hour
        await user.save();

        // Send the reset link to the user's email using nodemailer
        const transporter = nodemailer.createTransport({
            service: 'your_email_service_provider', // e.g., 'gmail'
            auth: {
                user: 'your_email@example.com',
                pass: 'your_email_password',
            },
        });

        const mailOptions = {
            from: 'your_email@example.com',
            to: user.email,
            subject: 'Password Reset',
            text: 'http://yourwebsite.com/reset-password/${resetToken}',
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ error: 'Error sending reset link email' });
            }
            console.log('Reset link sent:', info.response);
            res.json({ message: 'Reset link sent successfully' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Function to generate a unique reset token (you may need to implement this based on your requirements)
function generateResetToken() {
    // Use a library like crypto to generate a unique token
    // Example using crypto: return crypto.randomBytes(20).toString('hex');
    // Ensure the generated token is unique and secure
}

// Get user info endpoint
app.get('/user-info', authenticateToken, async (req, res) => {
    res.json({ email: req.user.email });
});

// Reset password endpoint
app.post('/reset-password', authenticateToken, async (req, res) => {
    try {
        const { newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email: req.user.email }, { password: hashedPassword });
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Middleware to authenticate token
function authenticateToken(req, res, next) {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, 'your_secret_key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });

        req.user = user;
        next();
    });
}

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});