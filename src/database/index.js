const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://santo:12345@cluster0.fmjuw.mongodb.net/telegram_manager?retryWrites=true&w=majority&appName=telegram_manager');
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
