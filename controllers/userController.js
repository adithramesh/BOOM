const express = require("express");
const flash = require("express-flash");
const bcrypt = require("bcrypt");
const { ObjectId } = require('mongoose').Types;
const User = require("../models/users");
const UserOtpModel = require("../models/otp");
const Product = require("../models/products");
const passport = require("passport");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const Category = require("../models/categories");
const Address = require("../models/address");
const Cart = require("../models/cart");
const Order = require("../models/order");
const Wallet = require("../models/wallet")
const Coupon = require("../models/coupon")
const crypto = require('crypto');
const Razorpay = require('razorpay');
require("dotenv").config();
require("../auth");
const { v4: uuidv4 } = require('uuid');
const { timeStamp } = require("console");
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');



exports.getHomePage = (req, res) => {
  try {
    console.log("inside homepage");
    if (req.session.isAuth || req.session.signup) {
      req.session.signup = false;
      return res.render("user/index");
    } else {
      res.redirect("/user/login");
    }
  } catch (err) {
    console.error("error in getting index page", err);
    res.redirect("/user/login");
  }
};

  
exports.getShopPage = async (req, res) => {
  try {
    console.log("inside shop page");
    const { category, sort, q } = req.query;  // Retrieve category, sort, and search query from query parameters
    // console.log("sort:", sort);

    const categories = await Category.find({ isBlocked: false });
    const categoriesNotBlockedId = categories.map((category) => category._id);

    // Define the sort options
    let sortOptions = {};
    switch (sort) {
      case "popularity":
        sortOptions.popularity = -1; // Assuming you have a 'popularity' field in your product schema
        break;
      case "priceAsc":
        sortOptions.price = 1;
        break;
      case "priceDesc":
        sortOptions.price = -1;
        break;
      case "ratings":
        sortOptions.averageRating = -1; // Assuming you have an 'averageRating' field in your product schema
        break;
      case "featured":
        sortOptions.featured = -1; // Assuming you have a 'featured' field in your product schema
        break;
      case "newArrivals":
        sortOptions.createdAt = -1;
        break;
      case "nameAsc":
        sortOptions.name = 1;
        break;
      case "nameDesc":
        sortOptions.name = -1;
        break;
      default:
        sortOptions = { createdAt: -1 }; // Default sorting by newest arrivals
    }
    // console.log("sortOptions:", sortOptions);

    let productFilter = {
      category: { $in: categoriesNotBlockedId },
      isBlocked: false,
    };

    if (category) {
      console.log("category:", category);
      const selectedCategory = await Category.findOne({ name: category, isBlocked: false });
      if (selectedCategory) {
        productFilter.category = selectedCategory._id;
        console.log(" productFilter.category (inside category selection condition):", productFilter.category);
        console.log("insideIfProductFilter:", productFilter);
      }
    }

    if (q) {
      productFilter.name = { $regex: q, $options: 'i' }; // Search for product names that contain the search query, case-insensitive
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 3; // Adjust the limit as needed
    const skip = (page - 1) * limit; 

    // Get the total number of products that match the filter
    const totalProducts = await Product.countDocuments(productFilter);
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch the products based on filter, sort, pagination
    const products = await Product.find(productFilter)
      .populate('category')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .exec();

    // Create an array to hold the bulk write operations
    const bulkOps = [];

    products.forEach(product => {
      const categoryDiscount = product.category ? product.category.discountPercentage : 0;
      const productDiscount = product.discountPercentage;
      const effectiveDiscount = Math.max(categoryDiscount, productDiscount);
      const newPrice = product.originalPrice - (product.originalPrice * (effectiveDiscount / 100));

      // Add the update operation to the bulkOps array
      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              discountPercentage: effectiveDiscount,
              price: newPrice
            }
          }
        }
      });
    });

    // Execute the bulk write operations
    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }
    // console.log("products (before rendering):", products);

    // Update categories with counts based on the current product filter
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category._id,
          isBlocked: false,
        });
        return {
          name: category.name,
          count: productCount,
        };
      })
    );

    // console.log("category:", categories);
    // console.log("categoriesWithCounts:", categoriesWithCounts);

    res.render("user/shop", { 
      products, 
      categoriesWithCounts, 
      q, 
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: totalPages,
      limit,
      sort, 
      category
    });
  } catch (err) {
    console.error("error in fetching products", err);
    res.status(500).send("Internal Server Error");
  }
};



exports.postShopPage = async (req, res) => {
  try {
    console.log("inside post shop page for category wise product display");
    const { selectedCategory } = req.body;
    console.log("inside post shop page with selected category:",selectedCategory);
    res.redirect('/user/shop?category=' + encodeURIComponent(selectedCategory));
  } catch (error) {
    console.error('Error processing category selection:', error);
    res.status(500).json({ success: false, error: 'Failed to process category selection' });
  }
};


exports.getProductDetailsPage = async (req, res) => {
  try {
    console.log("inside product details page");
    const productId = req.query.id;
    // console.log("product id;", productId);
    const productDetails = await Product.findById(productId)
      .populate("category")
      .exec();

        // Calculate the final price based on the greater discount
    const categoryDiscount = productDetails.category ? productDetails.category.discountPercentage : 0;
    const productDiscount = productDetails.discountPercentage;
    const effectiveDiscount = Math.max(categoryDiscount, productDiscount);
    productDetails.price = productDetails.originalPrice - (productDetails.originalPrice * (effectiveDiscount / 100));
    // console.log("product details:",productDetails);
    res.render("user/product-details", { productDetails });
  } catch (err) {
    console.error("error in getting product details", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.getWishlistPage=async(req,res)=>{
 
  console.log("Inside get wish list page with user");
  try {

    const userId = req.session.userId;
    console.log("usertId:",userId);
    // Check if user is authenticated
    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    // Fetch wishlist items for the logged-in user
    const user = await User.findById(userId).populate('wishlist.product');

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Extract wishlist items from user object
    const wishlist = user.wishlist;
    console.log("wishlist:",wishlist);
      // Send wishlist items to frontend
    res.render('user/wishlist', { wishlist }); // Assuming you have a wishlist.ejs file
} catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Internal server error' });
}
  
}

// exports.postAddToWishList=async(req,res)=>{
//   const {  productId, size } = req.body;
//   console.log("inside postAddToWishlist:", req.body);

    
//     // const user = await findUserWithId(req, res);
//     // userId = user._id;
//     const userId = req.session.userId;
//     console.log("usertId:",userId);
//     if (!userId) {
//       return res.status(401).json({ success: false, message: 'User not logged in' });
//   }
//     try {

//             // Check if the product exists
//             const product = await Product.findById(productId);
//             if (!product) {
//                 return res.status(404).json({ success: false, message: 'Product not found' });
//             }
    
//             const user = await User.findById(userId);
//             if (!user) {
//                 return res.status(404).json({ success: false, message: 'User not found' });
//             }
    
//             // Check if the product with the specified size is already in the wishlist
//             if (!user.wishlist.some(item => item.product.toString() === productId && item.size === size)) {
//                 user.wishlist.push({ product: productId, size });
//                 await user.save();
//             }

//         res.json({ success: true });
//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// }

exports.postAddToWishList = async (req, res) => {
  const { productId, size } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    console.log("User not logged in");
    return res.status(401).json({ success: false, message: 'User not logged in' });
  }

  try {
    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      console.log("Product not found");
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the product with the specified size is already in the wishlist
    if (!user.wishlist.some(item => item.product.toString() === productId && item.size === size)) {
      user.wishlist.push({ product: productId, size });
      await user.save();
      console.log("Product added to wishlist");
    } else {
      console.log("Product already in wishlist");
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};



exports.removeFromWishlist = async (req, res) => {
  try {
      console.log("inside remove product from wish list");
      const userId = req.session.userId;
      const { productId, size } = req.body;

      // Check if user is authenticated
      if (!userId) {
          return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
      }

      const result = await User.findByIdAndUpdate(userId, {
          $pull: { wishlist: { product: productId, size: size } }
      });

      res.status(200).json({ success: true, message: 'Product removed from wishlist successfully' });
  } catch (error) {
      console.error('Error removing product from wishlist:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.postAddToCart = async (req, res) => {
  try {
    console.log("inside post add to cart");

    const userId = req.session.userId;
    const { productId, size } = req.body;
    const quantity = 1;

    // Ensure quantity is a number
    const quantityNumber = parseInt(quantity, 10);
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const amount = product.price * quantityNumber;

    // Find the user's cart, create a new one if it doesn't exist
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], subTotal: 0 });
    }

    // Check if the product (with the same size) is already in the cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && item.size === size
    );

    console.log("existing item index:", existingItemIndex);

    // Get the size details for the product
    const sizeDetails = product.sizes.find(s => s.size === size);
    if (!sizeDetails) {
      return res.status(404).json({ success: false, error: "Size not found for the product" });
    }

    const availableQuantity = sizeDetails.quantity;
    console.log("available quantity:", availableQuantity);

    if (existingItemIndex > -1) {
      // Check if the total quantity would exceed the available quantity or the limit
      const newQuantity = cart.items[existingItemIndex].quantity + quantityNumber;
      const maxQuantity = Math.min(availableQuantity, 5);

      if (newQuantity <= maxQuantity) {
        // Update quantity and amount of the existing item
        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].amount += amount;
      } else {
        return res.status(400).json({ success: false, error: "Exceeds the available quantity or maximum limit per product per size." });
      }
    } else {
      // Add new item to the cart
      const quantityToAdd = Math.min(quantityNumber, availableQuantity, 5);

      if (quantityToAdd <= 0) {
        return res.status(400).json({ success: false, error: "Cannot add zero or negative quantity to the cart." });
      }

      cart.items.push({
        productId: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        images: product.images,
        quantity: quantityToAdd,
        size: size,
        colour: product.colour,
        amount: (product.price * quantityToAdd),
      });
    }

    // Update the subtotal price of the cart
    cart.subTotal += amount;

    // Save the updated cart
    await cart.save();

    res.json({ message: "Product added to cart successfully" });
  } catch (err) {
    console.error("Error in adding products to the cart:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.getCartPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    let cart = await Cart.findOne({ userId }).populate("items.productId");
        // // If the cart is null, set a default cart object with necessary properties
        // if (!cart) {
        //   cart = { subTotal: 0, discount: 0, totalPrice: 0, items: [] };
        // }

        if (!cart) {
          cart = new Cart({
            userId,
            subTotal: 0,
            discount: 0,
            totalPrice: 0,
            items: []
          });
        }
    
        // Ensure default values for cart properties
        cart.subTotal = cart.subTotal || 0;
        cart.discount = cart.discount || 0;
        cart.totalPrice = cart.subTotal - cart.discount;
        console.log("subtotal:",cart.subTotal);
        console.log("discount:",cart.discount);
        console.log("totalPricet:",cart.totalPrice);
        await cart.save();
        // cart.totalPrice = cart.totalPrice ? cart.totalPrice : cart.subTotal;
    

    const eligibleCoupons = await Coupon.find({ minimumPrice: { $lte: cart.subTotal },status:true });
        res.render("user/cart", { cart, eligibleCoupons });
   
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.postApplyCoupon = async (req, res) => {
  try {
    console.log("inside get apply coupon");
    const userId = req.session.userId;
    const { couponCode } = req.body;
    const coupon = await Coupon.findOne({ couponCode });

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    const cart = await Cart.findOne({ userId });

    if (cart.subTotal < coupon.minimumPrice) {
      return res.status(400).json({ error: "Cart total is less than minimum price for the coupon" });
    }

    let discount = 0;

    if (coupon.type === 'percentage') {
      discount = (coupon.discount / 100) * cart.subTotal;
    } else if (coupon.type === 'fixed') {
      discount = coupon.discount;
    }

    if (discount > coupon.maxRedeem) {
      discount = coupon.maxRedeem;
    }

    cart.discount = discount;
    cart.totalPrice = cart.subTotal - discount;
    console.log("cart.discount:",cart.discount);
    console.log("cart.totalPrice:",cart.totalPrice);
    await cart.save();

    res.json({ success: true, totalPrice: cart.totalPrice, discount: cart.discount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.postRemoveCoupon=async(req,res)=>{
  try {
    console.log("inside post remove coupon");
    const userId = req.session.userId;
    const cart = await Cart.findOne({ userId });

    // Reset discount and totalPrice to subTotal
    cart.discount = 0;
    cart.totalPrice = cart.subTotal;
     await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



exports.removeCartItems = async (req, res) => {
  try {
    console.log("inside remove cart items");

    const { name, userId, size } = req.query;
    console.log("Deleting cart item with userId:", userId, "and size:", size);
    const updatedCart = await Cart.findOneAndUpdate(
      { userId: userId }, // assuming you have the userId
      { $pull: { items: { name, size } } },
      { new: true }
    );

    console.log("updatedCart:", updatedCart);
    if (updatedCart) {
      updatedCart.subTotal = updatedCart.items.reduce((acc, curr) => {
        return acc + curr.quantity * curr.price;
      }, 0);

      // Fetch the applied coupon
      const appliedCoupon = await Coupon.findOne({ minimumPrice: { $lte: updatedCart.subTotal }, status: true });

      // If the subtotal is less than the minimum price required by the coupon, reset the discount to 0
      if (!appliedCoupon || updatedCart.subTotal < appliedCoupon.minimumPrice) {
        updatedCart.discount = 0;
      }

      updatedCart.totalPrice = updatedCart.subTotal - updatedCart.discount;
      await updatedCart.save();
    }
    res.redirect("/user/cart");
  } catch (err) {
    console.error("error in removing items", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateCartQuantity = async (req, res) => {
  const { cartId, productId, size, newQuantity } = req.body;

  try {
    // console.log("inside cart update quantity");
    // console.log("cartId:", cartId);
    // console.log("newQuantity:", newQuantity);
    // console.log("productId:", productId);
    // console.log("size:", size);

    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(400).json({ success: false, error: "Cart not found" });
    }

    // const item = cart.items.find(
    //   (item) =>
    //     item.productId.toString() === productId.toString() && item.size === size
    // );

    const item = cart.items.find(
      (item) =>
        item._id.toString() === productId.toString() && item.size === size
    );
    // console.log("item:", item);

    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found in cart" });
    }

    if (newQuantity < 1) {
      return res.status(400).json({ success: false, error: "Quantity cannot be less than 1" });
    }

    // Fetch product details using the productId from the cart item
    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const sizeDetails = product.sizes.find(s => s.size === size);
    if (!sizeDetails) {
      return res.status(404).json({ success: false, error: "Size not found for the product" });
    }

    const availableQuantity = sizeDetails.quantity;
    console.log("available quantity:", availableQuantity);

    if (newQuantity > Math.min(availableQuantity, 5)) {
      return res.status(400).json({ success: false, error: `Quantity cannot exceed ${Math.min(availableQuantity, 5)}` });
    }

    // Update the item quantity and amount
    item.quantity = newQuantity;
    item.amount = item.quantity * item.price;

    // Recalculate the sub total price of the cart
    cart.subTotal = cart.items.reduce((sum, item) => sum + item.amount, 0);
    cart.totalPrice=cart.subTotal-cart.discount
    await cart.save();

    res.json({
      success: true,
      newQuantity: item.quantity,
      itemAmount: item.amount,
      cartSubTotal: cart.subTotal,
      cartTotal:cart.totalPrice
    });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getProceedToCheckout = async (req, res) => {
  try {
    const user = await findUserWithId(req, res);
    const userId = user._id;
    const addresses = await Address.find({ userId: userId });

    console.log("inside get proceed to checkout");

    // Find the cart for the user
    let cart = await Cart.findOne({ userId });

    console.log("cart in proceed to checkout:", cart);
  
    req.session.cart=cart
    

    await cart.save();

    res.render("user/checkout", { cart, addresses });

  } catch (err) {
    console.error("Error in proceed to checkout", err);
    // Handle error response or redirect as necessary
    res.status(500).send("Error processing checkout");
  }
};


// exports.getProceedToCheckout = async (req, res) => {
//   try {
//     const user = await findUserWithId(req, res);
//     userId = user._id;
//     const addresses = await Address.find({ userId: userId });
//     const cart = await Cart.findOne({ userId });
//     console.log("cart:",cart);
//     await cart.save();
//     req.session.cart = cart;


//     // if (cart) {
//     //   cart = await Cart.create({
//     //     userId: userId,
//     //     items: req.session.cart.items || [],
//     //     subTotal: req.session.cart.subTotal || 0,
//     //     totalPrice: req.session.cart.totalPrice || 0,
//     //     discount: req.session.cart.discount || 0
//     //   });
//     //   req.session.cart = cart;
//     // }
//     console.log("inside get proceed to checkout page");
   
//     res.render("user/checkout", { cart, addresses });
//   } catch (err) {
//     console.error("Error in proceed to checkout", err);
//   }
// };

const razorpay = new Razorpay({
  key_id: 'rzp_test_qzAibN7X6K7MAx',
  key_secret: 'wwCtCerTPfwEf1t3MpMvcMmJ',
});

exports.createRazorpayOrder = async (req, res) => {
  try {
    const cart = req.session.cart;

    if (!cart) {
      req.flash('error', 'Your cart is empty');
      return res.redirect('/user/cart');
    }

    const amount = cart.totalPrice * 100; // Convert to paise

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: uuidv4(),
    };

    console.log("reciept in create razorpay order:", options.receipt);

    const order = await razorpay.orders.create(options);
    // console.log("order created:",order);
    // console.log("orderId:",order.orderId);
    // console.log("order._id",order._id);
    console.log("order in creat order:",order);

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({ success: false, error: 'Failed to create Razorpay order' });
  }
};

exports.postOrderStatus = async (req, res) => {
  try {
    const cart = req.session.cart;
    console.log("cart:",cart);
    if (!cart) {
      req.flash("error", "Your cart is empty");
      return res.redirect("/user/cart");
    }
    console.log("inside post order status");
    const user = await findUserWithId(req, res);
    const userId = user._id;
    const {
      selectedAddressId,
      selectedPaymentMethod,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = req.body;

    console.log("Request Body in postOrderStatus:", req.body);

    let deliveryAddress;

    if (ObjectId.isValid(selectedAddressId)) {
      const objectId = new ObjectId(selectedAddressId);
      const selectedAddress = await Address.findOne({ _id: objectId });
      if (selectedAddress) {
        deliveryAddress = `${selectedAddress.userName},${selectedAddress.houseName},${selectedAddress.street},${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.zipCode}`;
      } else {
        console.log("No address found with the given ID:", selectedAddressId);
      }
    } else {
      deliveryAddress = selectedAddressId;
    }

    console.log("Delivery Address:", deliveryAddress);

    const amount = cart.totalPrice+cart.deliveryCharge;

    let paymentStatus = 'Success';

    if (selectedPaymentMethod === 'UPI') {
      console.log("Payment method selected:", selectedPaymentMethod);
      const secret = 'wwCtCerTPfwEf1t3MpMvcMmJ';
      const hash = crypto.createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (hash !== razorpay_signature) {
        paymentStatus = 'Failure';
        console.log("Payment Status:", paymentStatus);
      }
    } else if (selectedPaymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        req.flash("error", "You don't have a wallet");
        return res.redirect('/user/proceed-checkout');
      }
      if (wallet.balance < amount) {
        req.flash("error", "Insufficient wallet balance");
        return res.redirect('/user/proceed-checkout');
      }
      wallet.balance -= amount;
      wallet.history.push({
        transaction: "debit",
        amount: amount,
        date: new Date(),
        reason: "Purchase done through wallet"
      });
      await wallet.save();
      console.log("Wallet balance deducted");
    }

    console.log("Payment Status before saving order:", paymentStatus);
    const newOrder = new Order({
      orderId: uuidv4(),
      user: userId,
      username: user.username,
      items: cart.items.map((item) => ({
        product: item.productId,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
      orderStatus: "Pending",
      deliveryAddress: deliveryAddress,
      amount: amount,
      paymentOption: selectedPaymentMethod,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      paymentStatus: paymentStatus
    });

    req.session.orderIsTrue = true;
    req.session.order = newOrder;
    newOrder.discount=cart.discount;
    console.log("newOrder paymentStatus", newOrder.paymentStatus);

    await newOrder.save();

    if (paymentStatus === 'Failure') {
      req.flash("error", "Invalid payment signature");
      console.log("failed payment");
      return res.redirect("/user/my-orders");
    }

    for (const item of newOrder.items) {
      await Product.findOneAndUpdate(
        { _id: item.product, "sizes.size": item.size },
        { $inc: { "sizes.$.quantity": -item.quantity } },
        { new: true }
      );
    }

    await Cart.findOneAndDelete({ _id: cart._id });
    req.session.cart = null;

    req.flash("success", "Order placed successfully");
    return res.status(200).json({ success: true, order: newOrder });

  } catch (error) {
    console.error("Error saving order:", error);
    req.flash("error", "An error occurred while placing the order");
    return res.redirect("/user/cart");
  }
};

// exports.postOrderStatus = async (req, res) => {
//   try {
//       const cart = req.session.cart;
//       if (!cart) {
//           req.flash("error", "Your cart is empty");
//           return res.redirect("/user/cart");
//       }
//       console.log("inside post order status");
//       const user = await findUserWithId(req, res);
//       const userId = user._id;
//       const {
//           selectedAddressId,
//           selectedPaymentMethod,
//           razorpay_payment_id,
//           razorpay_order_id,
//           razorpay_signature
//       } = req.body;

      
//       console.log("Request Body in postOrderStatus:", req.body);
      
    


//     let deliveryAddress;

//     if (ObjectId.isValid(selectedAddressId)) {
//         // Convert the string to an ObjectId
//         const objectId = new ObjectId(selectedAddressId);

//         const selectedAddress = await Address.findOne({ _id: objectId });
//         if (selectedAddress) {
//             deliveryAddress = `${selectedAddress.userName},${selectedAddress.houseName},${selectedAddress.street},${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.zipCode}`;
//         } else {
//             console.log("No address found with the given ID:", selectedAddressId);
//         }
//     } else {
//         deliveryAddress = selectedAddressId;
//     }

//     console.log("Delivery Address:", deliveryAddress);
     
//       const amount = cart.totalPrice;

//       let paymentStatus = 'Success';

//       if (selectedPaymentMethod === 'UPI') {
//           console.log("Payment method selected:", selectedPaymentMethod);
//           const secret = 'wwCtCerTPfwEf1t3MpMvcMmJ';
//           const hash = crypto.createHmac('sha256', secret)
//               .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//               .digest('hex');

//           if (hash !== razorpay_signature) {
//               paymentStatus = 'Failure';
//               console.log("Payment Status:", paymentStatus);
//           }
//       }
//       console.log("Payment Status before saving order:", paymentStatus);
//       const newOrder = new Order({
//           orderId: uuidv4(),
//           user: userId,
//           username: user.username,
//           items: cart.items.map((item) => ({
//               product: item.productId,
//               size: item.size,
//               quantity: item.quantity,
//               price: item.price,
//           })),
//           orderStatus: "Pending",
//           deliveryAddress: deliveryAddress,
//           amount: amount,
//           paymentOption: selectedPaymentMethod,
//           razorpayPaymentId: razorpay_payment_id,
//           razorpayOrderId: razorpay_order_id,
//           paymentStatus: paymentStatus
//       });

//       req.session.orderIsTrue = true;
//       req.session.order = newOrder;
//       console.log("newOrder paymentStatus", newOrder.paymentStatus);
     
//       await newOrder.save();

//       if (paymentStatus === 'Failure') {
//           req.flash("error", "Invalid payment signature");
//           console.log("failed payment");
//           // Redirect to my-orders page on payment failure
//           return res.redirect("/user/my-orders");
//       }

//       for (const item of newOrder.items) {
//           await Product.findOneAndUpdate(
//               { _id: item.product, "sizes.size": item.size },
//               { $inc: { "sizes.$.quantity": -item.quantity } },
//               { new: true }
//           );
//       }

//       await Cart.findOneAndDelete({ _id: cart._id });
//       req.session.cart = null;

//       req.flash("success", "Order placed successfully");
//       return res.status(200).json({ success: true, order: newOrder });

//   } catch (error) {
//       console.error("Error saving order:", error);
//       req.flash("error", "An error occurred while placing the order");
//       return res.redirect("/user/cart");
//   }
// };


exports.retryPayment = async (req, res) => {
  try {
      const orderId = req.params.id;
      console.log("orderId:",orderId);
      const order = await Order.findOne({_id:orderId});

      if (!order || order.paymentStatus !== 'Failure') {
          req.flash("error", "Invalid order or order is not eligible for retry");
          return res.redirect("/user/orders");
      }

      const options = {
          amount: order.amount * 100, // Convert to paise
          currency: 'INR',
          receipt: order.orderId,
          // receipt: uuidv4(),
      };

      console.log("reciept in retry payment:", options.receipt);

      const newRazorpayOrder = await razorpay.orders.create(options);
      order.razorpayOrderId = newRazorpayOrder.id;
      await order.save();

      console.log("order in retry payment:", order);
      return res.status(200).json({ 
          success: true, 
          order: newRazorpayOrder, 
          selectedAddressId: order.deliveryAddress,
          selectedPaymentMethod: order.paymentOption
      });
  } catch (error) {
      console.error('Error retrying Razorpay order:', error);
      return res.status(500).json({ success: false, error: 'Failed to retry Razorpay order' });
  }
};


exports.getThankYouPage=async(req,res)=>{
  try{
    console.log("inside get thank you page");
    if(req.session.orderIsTrue){
      orderStatus=req.session.order
      res.render("user/thankyou", { order: orderStatus});
    }
    
  }catch(err){
    console.error("error in getting Thank You page",err);
  }

}

exports.getUserProfile = async (req, res) => {
  try {
     if (req.session.isAuth) {
      console.log("inside getUserProfile");

    const userId = req.session.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { email, username, phoneNumber, referralCode } = user;
    res.render("user/user-profile", { email, username, phoneNumber, referralCode });
  }
  } catch (err) {
    console.error("Error in getting user profile", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.editUserProfile = async (req, res) => {
  try {
    console.log("inside edit user endpoint");
    const userId = req.session.userId;

    const { username, email, phoneNumber } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email, phoneNumber },
      { new: true }
    );
    if (updatedUser) {
      console.log("updated user:", updatedUser);
      req.session.user = updatedUser;
      res.redirect('/user/user-profile'); // Redirect to the profile page
    } else {
      res.status(404).send("User not updated");
    }
  } catch (err) {
    console.error("Error in updating user details", err);
    res.status(500).send("Internal Server Error");
  }
};


exports.getOrders = async (req, res) => {
  try {
    console.log("inside get orders/my orders");
    const userId = req.session.userId; // Assuming user ID is stored in session
    
    // Pagination variables
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Adjust the limit as needed
    const skip = (page - 1) * limit; 

    // Fetch orders with pagination
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("items.product")
      .limit(limit)
      .skip(skip)
      .exec();

    // Total orders count for the user
    const totalOrders = await Order.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalOrders / limit);
    let startIndex=skip+1;

    // Render the orders page with pagination details
    res.render("user/my-orders", { 
      orders,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: totalPages,
      startIndex,
      limit 
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    req.flash("error", "Unable to fetch orders");
    res.redirect("/user/index");
  }
};


exports.postUpdateOrderStatus = async (req, res) => {
  try {
    console.log("Inside update order status");

    const orderId = req.params.id;
    const action = req.body.action;
    const order = await Order.findById(orderId);

    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/user/my-orders");
    }

    if (action === "cancel" && order.orderStatus !== "Pending") {
      req.flash("error", "Order cannot be cancelled");
      return res.redirect("/user/my-orders");  
    }

    if (action === "return" && order.orderStatus !== "delivered") {
      req.flash("error", "Order cannot be returned");
      return res.redirect("/user/my-orders");
    }

    order.orderStatus = action === "cancel" ? "Cancelled" : "Returned";

    for (const item of order.items) {
      await Product.findOneAndUpdate(
        { _id: item.product, "sizes.size": item.size },
        { $inc: { "sizes.$.quantity": +item.quantity } },
        { new: true }
      );
    }
    await order.save();

    console.log("Order status updated:", order.orderStatus);

    if (order.paymentOption === "UPI" && order.paymentStatus === "Success") {
      const refundAmount = order.amount;
      const userId = req.session.userId;
      const wallet = await Wallet.findOne({ userId });

      if (wallet) {
        // Update existing wallet balance and history
        wallet.balance += refundAmount;
        wallet.history.push({
          transaction: "credit",
          amount: refundAmount,
          date: new Date(),
          reason: action === "cancel" ? "Order cancellation" : "Order return"
        });
        await wallet.save();
      } else {
        // Create a new wallet document
        await Wallet.create({
          userId,
          balance: refundAmount,
          history: [{
            transaction: "credit",
            amount: refundAmount,
            date: new Date(),
            reason: action === "cancel" ? "Order cancellation" : "Order return"
          }]
        });
      }
      req.flash("success", `Order ${action}led successfully and wallet updated`);
    } else {
      req.flash("success", `Order ${action}led successfully`);
    }

    res.redirect("/user/my-orders");
  } catch (error) {
    console.error(`Error ${action}ling order:`, error);
    req.flash("error", `Unable to ${action} order`);
    res.redirect("/user/my-orders");
  }
};



exports.downloadInvoice = async (req, res) => {
  const orderId = req.params.id;
  let userId=req.session.userId
 

  try {
      const order = await Order.findById(orderId).populate('items.product');
      if (!order) {
          return res.status(404).send('Order not found');
      }

      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, '..', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
          fs.mkdirSync(invoicesDir);
      }

      // Create a document
      const doc = new PDFDocument({ margin: 30 });

      // Define file paths
      const fileName = `BOOM-Invoice-${orderId}.pdf`;
      const filePath = path.join(invoicesDir, fileName);
      const writeStream = fs.createWriteStream(filePath);

      // Pipe the PDF document to the file stream
      doc.pipe(writeStream);

      // Add content to the PDF
      doc.fontSize(20).text('BOOM Apparel Shopping', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Order ID: ${orderId}`, { align: 'left' });
      doc.text(`Date: ${new Date().toDateString()}`, { align: 'left' });
      doc.text(`Time: ${new Date().toLocaleTimeString()}`, { align: 'left' });

      doc.moveDown();

      // Define table headers
      const tableTop = 160;
      const itemCodeX = 50;
      const descriptionX = 100;
      const quantityX = 250;
      const priceX = 350;
      const amountX = 450;

      // Draw table headers
      doc.fontSize(12)
          .text('Sl. No.', itemCodeX, tableTop)
          .text('Product Name', descriptionX, tableTop)
          .text('Quantity', quantityX, tableTop)
          .text('Price', priceX, tableTop)
          .text('Amount', amountX, tableTop);

      // Draw table rows
      let i;
      let item;
      const items = order.items;
      let y = tableTop + 25;

      for (i = 0; i < items.length; i++) {
          item = items[i];
          doc.fontSize(10)
              .text(i + 1, itemCodeX, y)
              .text(item.product.name, descriptionX, y)
              .text(item.quantity, quantityX, y)
              .text(`Rs. ${item.price.toFixed(2)}`, priceX, y)
              .text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, amountX, y);

          y += 25;
      }

      // Add total calculations
      const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      console.log("userId:",userId);
      // let cart = await Cart.findOne({ userId: userId });
      // console.log("cart:",cart);
      const discount = order.discount || 0;
      const deliveryCharges = order.deliveryCharge;
      const total = subtotal - discount + deliveryCharges;

      doc.moveDown().moveDown();
      doc.fontSize(12)
          .text(`Subtotal: Rs. ${subtotal.toFixed(2)}`, { align: 'right' })
          .text(`Discount: Rs. ${discount.toFixed(2)}`, { align: 'right' })
          .text(`Delivery: Rs. ${deliveryCharges.toFixed(2)}`, { align: 'right' })
          .text(`Total: Rs. ${total.toFixed(2)}`, { align: 'right' });

      // Add note at the bottom
      doc.moveDown().fontSize(10).text('This is an e-invoice.', { align: 'center' });

      // End and finalize the PDF document
      doc.end();

      // Event listeners for the write stream
      writeStream.on('finish', () => {
          res.download(filePath);
      });

      writeStream.on('error', (error) => {
          console.error('Error generating invoice:', error);
          res.status(500).send('Error generating invoice');
      });

  } catch (error) {
      console.error('Error generating invoice:', error);
      res.status(500).send('Error generating invoice');
  }
};




async function findUserWithId(req, res) {
  const userId = req.session.userId;
  const existingUser = await User.findOne({ _id: userId });
  return existingUser;
}

exports.getResetPassword = async (req, res) => {
  try {
    console.log("inside get reset password page");
    res.render("user/reset-password");
  } catch (err) {
    console.error("Error in reseting password", err);
  }
};

exports.postResetPassword = async (req, res) => {
  try {
    console.log("inside post reset password");
    const user = await findUserWithId(req, res);
    if (!user) {
      return res.redirect("/user/login");
    }
    const { existingPassword, newPassword, confirmPassword } = req.body;
    if (
      user.isBlocked == false &&
      (await bcrypt.compare(existingPassword, user.password))
    ) {
      if (newPassword === confirmPassword) {
        // console.log(password,confirmPassword);
        const hashedPassword = await bcrypt.hash(newPassword, 6);
        await User.findOneAndUpdate(
          { _id: user._id },
          { password: hashedPassword }
        );
        req.flash("success", "Password updated successfully");
        res.redirect("/user/user-profile");
      } else {
        req.flash("error", "New passwords do not match");
        res.redirect("/user/reset-password");
      }
    } else {
      req.flash("error", "Existing password is incorrect.");
      res.redirect("/user/reset-password");
    }
  } catch (err) {
    console.error("some error in updating password", err);
    req.flash("error", "An error occurred while updating the password.");
    res.redirect("/user/user-profile");
  }
};

exports.getWallet=async(req,res)=>{
  try{
    console.log("inside get wallet page");
    const userId=req.session.userId;
    const wallet=await Wallet.findOne({userId})
    const walletBalance = wallet?.balance ?? 0;
    const walletHistory = wallet?.history ?? [];
    walletHistory.sort((a, b) => b.date - a.date);
    res.render('user/wallet',{walletBalance,walletHistory})
  }catch(err){
    console.error("Error in getting wallet details",err);
    return res.redirect("/user/index");
  }
}

exports.getAddress = async (req, res) => {
  try {
    const user = await findUserWithId(req, res);
    userId = user._id;
    const savedAddress = await Address.find({ userId: userId });
    console.log("inside getAddress with savedAddress");

    // console.log("savedAddress:", savedAddress);
    res.render("user/address", { user, savedAddress });
  } catch (err) {
    console.error("Error in getting users address", err);
  }
};

exports.postAddress = async (req, res) => {
  try {
    console.log("inside post address");
    const {
      userName,
      addressType,
      houseName,
      street,
      city,
      state,
      country,
      zipCode,
    } = req.body;
    const userId = req.session.userId;
    console.log("userId:", userId);

    const newAddress = {
      userId,
      userName,
      addressType,
      houseName,
      street,
      city,
      state,
      country,
      zipCode,
    };
    await Address.create(newAddress);
    console.log("created at:", newAddress.createdAt);
    console.log("updatedd at:", newAddress.updatedAt);
    // res.redirect('/user/address')
    res.status(201).json(newAddress);
  } catch (err) {
    console.error("Error in posting Address", err);
  }
};

exports.editAddress = async (req, res) => {
  try {
    console.log("inside edit address");
    const id = req.params.id;
    console.log("req.params.id:", id);
    const updatedAddress = req.body;
    console.log("updatedAddress:", updatedAddress);
    const address = await Address.findByIdAndUpdate(id, updatedAddress, {
      new: true,
    });

    if (address) {
      res.json(address);
    } else {
      res.status(404).send("Address not found");
    }
  } catch (err) {
    res.status(500).send("Internal server error");
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    console.log("inside delete address");
    const id = req.params.id;
    const address = await Address.findByIdAndDelete(id);
    if (address) {
      res.status(204).send();
    } else {
      res.status(404).send("Address not found");
    }
  } catch (err) {
    res.status(500).send("Internal server error");
  }
};

exports.getRegisterPage = (req, res) => {
  console.log("inside getRegisterPage");
  const error = req.query.error;
  res.render("user/register", { error });
};


exports.postRegisterPage = async (req, res) => {
  try {
    console.log("inside postRegisterPage");
    const { username, password, confirmPassword, email, phoneNumber, referralCode } = req.body;
    req.session.referralCode=referralCode;
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      res.redirect("/user/login");
    } else {
      if (password === confirmPassword) {
        const hashedPassword = await bcrypt.hash(password, 6);
        const referralCodeGenerated = await generateUniqueReferralCode();
        const data = { username, password: hashedPassword, email, phoneNumber, referralCode : referralCodeGenerated };

        req.session.user = data;
        console.log(req.session.user);
        req.session.signup = true;

        const otp = generateOtp();
        const currTime = Date.now();
        const expTime = currTime + 60 * 1000;
        await UserOtpModel.updateOne(
          { email: email },
          { $set: { email, otp, expiry: new Date(expTime) } },
          { upsert: true }
        );
        await sendmail(email, otp);

        return res.redirect("/user/otp");
      } else {
        res.redirect("/user/register");
        res.status(401).send("Password not matched");
      }
    }
  } catch (err) {
    console.error("Error in registering user", err);
  }
};


const generateUniqueReferralCode = async () => {
  let isUnique = false;
  let referralCode;
  while (!isUnique) {
      referralCode = 'ref-' + Math.random().toString(36).substr(2, 9);
      const existingCode = await User.findOne({ referralCode: referralCode });
      if (!existingCode) {
          isUnique = true;
      }
  }
  return referralCode;
};

function generateOtp() {
  try {
    const otp = otpGenerator.generate(4, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });
    console.log("OTP :", otp);
    return otp;
  } catch (err) {
    console.error("Error in generating OTP", err);
    res.redirect("user/register");
  }
}

const sendmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "adithramesh90@gmail.com",
        pass: "bale rnnj krbj sech",
      },
    });

    const mailContent = {
      from: "BOOM<adithramesh90@gmail.com>",
      to: email,
      subject: "E-mail Verification",
      html: `<p>Dear User,</p>
           <p>Welcome to BOOM online apparel shopping, please use the following<br> <span style="font-weight: bold; color: #ff0000;">OTP: ${otp}</span></p>
           <p>Enter this OTP on our website to verify your email address and access your account.</p>
           <p>Kindly ingore this email if you do not want to register with us.</p>
           <p>Welcome to BOOM!</p>
           <p>Best regards,<br/>BOOM Apparels</p>`,
    };

    await transporter.sendMail(mailContent);
    console.log("Email sent successfuly");
  } catch (err) {
    console.error("Error in sending mail", err);
  }
};

exports.getOtp = (req, res) => {
  try {
    res.render("user/otp");
  } catch (err) {
    console.error("Error in generating OTP");
    res.redirect("/user/register");
  }
};

exports.postOtp = async (req, res) => {
  console.log("inside postsOtpPage");
  try {
    const enteredOtp = req.body.otp;
    const user = req.session.user;
    
    let email = req.session.email ? req.session.email : req.session.user.email;

    if (!email) {
      email = req.session.email; //for forgot password otp
    }
    // console.log(enteredOtp,user,email);
    const otpUser = await UserOtpModel.findOne({ email });
    otpInDb = otpUser.otp;
    console.log("entered otp:", enteredOtp);
    console.log("OTP in db", otpInDb);
    const expiry = otpUser.expiry;
    if (enteredOtp != otpInDb || expiry.getTime() < Date.now()) {
      console.log("wrong OTP or time expired");
      req.flash(
        "error",
        "Entered wrong OTP or time expired. Please regenerate OTP."
      );
      return res.redirect("/user/otp");
    }
    if (enteredOtp == otpInDb && expiry.getTime() >= Date.now()) {
      console.log("enetered if cond");

      if (req.session.signup) {
        user.isVerified = true;
        console.log("user verified");
        await User.create(user);
        const userOne = await User.findOne({ email: user.email });
        console.log("user in postOtp:", user);

        //referralCode logic
        const referralCode=req.session.referralCode
        if(referralCode){
          const referrer = await User.findOne({referralCode})
        
        if(referrer){
          let referrerWallet= await Wallet.findOne({userId:referrer._id})
          if(!referrerWallet){
            referrerWallet = new Wallet({userId:referrer._id, balance:200})
          } else {
            referrerWallet.balance += 200;
          }

          referrerWallet.history.push({
            transaction:"Credit",
            amount:200,
            date:new Date(),
            reason:"Referral Bonus"
          })
          await referrerWallet.save();

            // Update new user's wallet
            const newUserWallet = new Wallet({
              userId: userOne._id,
              balance: 200,
              history: [{
                transaction: "Credit",
                amount: 200,
                date: new Date(),
                reason: "Referral bonus"
              }]
            });
            await newUserWallet.save();
        }
      }

        req.session.isAuth = true;
        req.session.userId = userOne._id;
        console.log("user._id:", userOne._id);
        return res.redirect("/user/index");
      } else if (req.session.otp) {
        //for forgot password otp
        return res.redirect("/user/reset-password-login");
      } else {
        req.flash("otperror", "Entered wrong OTP or Time expired");
      }
    }
  } catch (err) {
    console.error("OTP verification error", err);
    res.redirect("/user/register");
  }
};

exports.getResendOtp = async (req, res) => {
  try {
    const email = req.session.user.email;
    console.log("resend otp mail:", email);
    console.log("inside resend otp");
    const otp = generateOtp();
    const currTime = Date.now();
    const expTime = currTime + 60 * 1000;
    await UserOtpModel.updateOne(
      { email: email },
      { $set: { email, otp, expiry: new Date(expTime) } },
      { upsert: true }
    );
    await sendmail(email, otp);
    return res.redirect("/user/otp");
  } catch (err) {
    console.error("Error in resending OTP", err);
    res.redirect("/user/login");
  }
};

exports.getLoginPage = (req, res) => {
  if (req.session.isAuth) {
    console.log("session activated");
    return res.redirect("/user/index");
  } else {
    console.log("inside get login page");
    return res.render("user/login");
  }

  // console.error("Error rendering login page:", error);
  // res.status(500).send("Error rendering login page");
};

exports.postLoginPage = async (req, res) => {
  try {
    console.log("inside postLoginPage");
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    console.log(user);

    if (!user) {
      req.flash("error", "User not found, please register");
      return res.redirect("/user/register?error=notfound");
    }

    if (user.isBlocked) {
      req.flash("error", "Your account is blocked");
      req.session.destroy(); // Clear any existing session
      return res.redirect("/user/login");
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      req.flash("error", "Wrong password entered");
      console.log("Flash messages:", req.flash("error")); // Add this line to debug
      return res.redirect("/user/login");
    }

    // If everything is correct
    req.session.user = user;
    req.session.isAuth = true;
    req.session.userId = user._id;
    // console.log("req.session.userId:", req.session.userId);
    return res.redirect("/user/index");
  } catch (err) {
    console.error("some error in logging in", err);
    req.flash("error", "An error occurred while logging in");
    res.redirect("/user/login");
  }
};

exports.getForgotPasswordPage = async (req, res) => {
  try {
    console.log("inside get forgot password page");
    res.render("user/forgot-password");
  } catch (err) {
    console.error("error in getting forgot password page", err);
  }
};

exports.postForgotPasswordPage = async (req, res) => {
  try {
    console.log("inside post forgot password page");
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "No account with that email found.");
      return res.redirect("/user/forgot-password");
    }
    // Generate and send OTP (Implement this function)
    const otp = generateOtp();
    const currTime = Date.now();
    const expTime = currTime + 60 * 1000;
    await UserOtpModel.updateOne(
      { email: email },
      { $set: { email, otp, expiry: new Date(expTime) } },
      { upsert: true }
    );
    await sendmail(email, otp);
    req.session.otp = otp;
    req.session.email = email;
    req.session.userId = user._id;
    res.redirect("/user/otp");
    // res.redirect('/user/reset-password-login'); // Redirect to the reset password page
  } catch (err) {
    console.error("Error in getting forgot password page", err);
  }
};

exports.getResetPasswordAtLogin = async (req, res) => {
  try {
    console.log("inside get reset password page");
    res.render("user/reset-password-login");
  } catch (err) {
    console.error("Error in reseting password", err);
  }
};

exports.postResetPasswordAtLogin = async (req, res) => {
  try {
    console.log("inside post reset password");
    const user = await findUserWithId(req, res);
    if (!user) {
      return res.redirect("/user/login");
    }
    const { newPassword, confirmPassword } = req.body;
    if (user.isBlocked == false) {
      if (newPassword === confirmPassword) {
        // console.log(password,confirmPassword);
        const hashedPassword = await bcrypt.hash(newPassword, 6);
        await User.findOneAndUpdate(
          { _id: user._id },
          { password: hashedPassword }
        );
        req.flash("success", "Password updated successfully");
        res.redirect("/user/login");
      } else {
        req.flash("error", "New passwords do not match");
        res.redirect("/user/reset-password-login");
      }
    } else {
      req.flash("error", "You are not an existing user");
      res.redirect("/user/reset-password-login");
    }
  } catch (err) {
    console.error("some error in updating password", err);
    req.flash("error", "An error occurred while updating the password.");
    res.redirect("/user/login");
  }
};

exports.getlogoutPage = (req, res) => {
  try {
    // if (!req.session.isAuth) {
    //   return res.redirect("/user/login");
    // }
    req.session.isAuth = false;
    return res.redirect("/user/login");
  } catch (err) {
    console.error("Error in logging out", err);
    return res.redirect("/user/login");
  }
};
