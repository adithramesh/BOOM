

const mongoose = require('mongoose');

const sizeQuantitySchema = new mongoose.Schema({
    size: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    }
});

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    originalPrice:{
        type:Number,
        required:true
    },
    discountPercentage: {
        type: Number,
        min: 0,
        max: 90,
        default: 0
    },
    price: {
        type: Number,
        required: true
    },
    images: {
        type: [String], // Assuming image URLs will be stored as strings
        required: true
    },
    sizes: {
        type: [sizeQuantitySchema],
        required: true
    },
    colour: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Method to calculate final price based on discount
// productSchema.methods.calculateFinalPrice = function() {
//     return this.originalPrice - (this.originalPrice * (this.discountPercentage / 100));
// };

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
