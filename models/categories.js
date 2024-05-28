const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    // subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
    
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
