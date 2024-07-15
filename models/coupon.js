const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: true,
        uppercase: true,
        unique: true // Ensuring coupon codes are unique
    },
    type: {
        type: String,
        required: true,
        enum: ['percentage', 'fixed'] // Define the possible types of discounts
    },
    minimumPrice: {
        type: Number,
        required: true,
        min: 0 // Ensure minimum price is not negative
    },
    discount: {
        type: Number,
        required: true,
        min: 0,
        max: 100 // This range is appropriate for percentage-based discounts
    },
    maxRedeem: {
        type: Number,
        required: true,
        min: 0 // Ensure max redeem is not negative
    },
    expiry: {
        type: Date,
        required: true
    },
    status: {
        type: Boolean,
        required: true,
        default: true
    }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
