const mongoose = require('mongoose');

const userOtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: Number,
        required: true
    },
    expiry: {
        type: Date,
        required: true
    }
});

const UserOtpModel = mongoose.model('UserOtpModel', userOtpSchema);

module.exports = UserOtpModel;
