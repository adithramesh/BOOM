const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username:{
        type: String,
        required: true,
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        size: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    }],
    orderStatus: {
        type: String,
        default: 'Pending',
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    deliveryAddress: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentOption: {
        type: String, // Changed to String to be more descriptive
        required: true
    },
    isBlocked:{
        type:Boolean,
        default:false
    }
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
