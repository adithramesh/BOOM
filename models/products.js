// const mongoose = require('mongoose');

// const productSchema = new mongoose.Schema({
//     name: {
//         type: String,
//         required: true
//     },
//     description: {
//         type: String,
//         required: true
//     },
//     price: {
//         type: Number,
//         required: true
//     },
//     images: {
//         type: [String], // Assuming image URLs will be stored as strings
//         required: true
//     },
//     quantity:{
//         type: Number,
//         required:true
//     },
//     size:{
//         type:[String],
//         required:true
//     },
//     colour:{
//         type: String,
//         required:true
//     },
//     category:{
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Category'
//     },
//     isBlocked:{
//         type:Boolean,
//         default:false
//     }
// },
// {timestamps:true}
// );

// const Product = mongoose.model('Product', productSchema);

// module.exports = Product;

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

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
