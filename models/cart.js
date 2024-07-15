const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    images: {
        type: [String], // Assuming image URLs will be stored as strings
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    colour: {
        type: String,
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    amount: {
        type: Number,
        required: true
    }
});

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema],
    subTotal: {
        type: Number,
        required: true,
        default: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0
    },
    discount: {
        type: Number,
        required: true,
        default: 0
    },
    deliveryCharge:{
        type: Number,
        required: true,
        default: 150,
    },
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
