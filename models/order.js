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
    discount:{
        type: Number,
        required: true,
        default: 0,
    },
    deliveryCharge:{
        type: Number,
        required: true,
        default: 150,
    },
    
    paymentOption: {
        type: String, // Changed to String to be more descriptive
        required: true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Success', 'Failure'],
        default: 'Pending', // 'Pending', 'Success', 'Failure'
        required: true
      },
      razorpayPaymentId: {
        type: String,
        default: null // or required based on your logic
    },
    razorpayOrderId: {
        type: String,
        default: null // or required based on your logic
    },
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
