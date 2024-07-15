const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  discountPercentage: {
    type: Number,
    min: 0,
    max: 90,
    default: 0,
  },
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
