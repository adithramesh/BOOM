const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
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
    quantity:{
        type: Number,
        required:true
    },
    size:{
        type:[String],
        required:true
    },
    colour:{
        type: String,
        required:true
    },
    category:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    isBlocked:{
        type:Boolean,
        default:false
    }
    // subcategory:[{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Category'
    // }]
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
