const express = require("express");
const flash = require("express-flash");
const bcrypt = require("bcrypt");
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
require("dotenv").config();
require("../auth");
const { v4: uuidv4 } = require("uuid");

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
    const { sort } = req.query;
    console.log("sort:", sort);

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
    console.log("sortOptions:", sortOptions);

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

    const products = await Product.find({
      category: { $in: categoriesNotBlockedId },
      isBlocked: false,
    }).sort(sortOptions);

    // console.log("products:",products);
    // console.log("category:",categories);
    res.render("user/shop", { products, categoriesWithCounts });
  } catch (err) {
    console.error("error in fetching products", err);
  }
};

// exports.getShopPage = async (req, res) => {
//     try {
//         console.log("inside shop page");

//         const { sort } = req.query;

//         // Fetch categories that are not blocked
//         const categories = await Category.find({ isBlocked: false });
//         const categoriesNotBlockedId = categories.map(category => category._id);

//         // Define the sort options
//         let sortOptions = {};
//         switch (sort) {
//             case 'popularity':
//                 sortOptions.popularity = -1; // Assuming you have a 'popularity' field in your product schema
//                 break;
//             case 'priceAsc':
//                 sortOptions.price = 1;
//                 break;
//             case 'priceDesc':
//                 sortOptions.price = -1;
//                 break;
//             case 'ratings':
//                 sortOptions.averageRating = -1; // Assuming you have an 'averageRating' field in your product schema
//                 break;
//             case 'featured':
//                 sortOptions.featured = -1; // Assuming you have a 'featured' field in your product schema
//                 break;
//             case 'newArrivals':
//                 sortOptions.createdAt = -1;
//                 break;
//             case 'nameAsc':
//                 sortOptions.name = 1;
//                 break;
//             case 'nameDesc':
//                 sortOptions.name = -1;
//                 break;
//             default:
//                 sortOptions = { createdAt: -1 }; // Default sorting by newest arrivals
//         }

//         // Fetch products based on the categories and apply sorting
//         const products = await Product.find({
//             category: { $in: categoriesNotBlockedId },
//             isBlocked: false
//         }).sort(sortOptions);

//         res.render('user/shop', { products });
//     } catch (err) {
//         console.error("error in fetching products", err);
//         res.status(500).send('Server Error');
//     }
// };

exports.getProductDetailsPage = async (req, res) => {
  try {
    console.log("inside product details page");
    const productId = req.query.id;
    console.log("product id;", productId);
    const productDetails = await Product.findById(productId)
      .populate("category")
      .exec();
    // console.log("product details:",productDetails);
    res.render("user/product-details", { productDetails });
  } catch (err) {
    console.error("error in getting product details", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.postAddToCart = async (req, res) => {
  try {
    console.log("inside post add to cart");
    console.log("req.session.userId:", req.session.userId);

    const userId = req.session.userId;
    const { productId, size, quantity } = req.body;

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
      cart = new Cart({ userId, items: [], totalPrice: 0 });
    }

    // Check if the product (with the same size) is already in the cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId && item.size === size
    );
    if (existingItemIndex > -1) {
      // Update quantity and amount of the existing item
      cart.items[existingItemIndex].quantity += quantityNumber;
      cart.items[existingItemIndex].amount += amount;
    } else {
      // Add new item to the cart
      cart.items.push({
        productId: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        images: product.images,
        quantity: quantityNumber,
        size: size,
        colour: product.colour,
        amount: amount,
      });
    }

    // Update the total price of the cart
    cart.totalPrice += amount;

    // Save the updated cart
    await cart.save();
    console.log("cart:", cart);

    // Redirect to the cart page
    // res.redirect('/user/cart');
    res.json({ message: "Product added to cart successfully" });
  } catch (err) {
    console.error("Error in adding products to the cart:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getCartPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    res.render("user/cart", { cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
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
    ).then((updatedCart) => {
      console.log("updatedCart:", updatedCart);
      if (updatedCart) {
        updatedCart.totalPrice = updatedCart.items.reduce((acc, curr) => {
          return acc + curr.quantity * curr.price;
        }, 0);
        updatedCart.save();
      }
      res.redirect("/user/cart");
    });
  } catch (err) {
    console.error("error in removing items", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateCartQuantity = async (req, res) => {
  const { cartId, productId, size, newQuantity } = req.body;

  try {
    console.log("inside cart update quantity");
    console.log("cartId:", cartId);
    console.log("newQuantity:", newQuantity);
    console.log("productId:", productId);
    console.log("size:", size);
    const cart = await Cart.findById(cartId);

    console.log("cart:", cart);
    if (!cart) {
      return res.status(400).json({ success: false, error: "Cart not found" });
    }

    const item = cart.items.find(
      (item) =>
        item._id.toString() === productId.toString() && item.size === size
    );
    console.log("item:", item);

    if (item) {
      if (newQuantity < 1) {
        return res
          .status(400)
          .json({ success: false, error: "Quantity cannot be less than 1" });
      }

      item.quantity = newQuantity;
      item.amount = item.quantity * item.price;
      cart.totalPrice = cart.items.reduce((sum, item) => sum + item.amount, 0); // Recalculate cart total price
      console.log("cart:", cart);

      await cart.save();
      console.log("cart amount:", item.amount);
      console.log("total amount:", cart.totalPrice);

      res.json({
        success: true,
        newQuantity: item.quantity,
        itemAmount: item.amount,
        cartTotal: cart.totalPrice,
      });
    } else {
      res.status(404).json({ success: false, error: "Item not found in cart" });
    }
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getProceedToCheckout = async (req, res) => {
  try {
    const user = await findUserWithId(req, res);
    userId = user._id;
    const addresses = await Address.find({ userId: userId });
    const cart = await Cart.findOne({ userId });
    if (cart) {
      req.session.cart = cart;
    }
    console.log("inside get proceed to checkout page");
    res.render("user/checkout", { cart, addresses });
  } catch (err) {
    console.error("Error in proceed to checkout", err);
  }
};

exports.postOrderStatus = async (req, res) => {
  try {
    console.log("Inside post order status/thank you page");
    const cart = req.session.cart;
    console.log("cart:", cart);

    if (!cart) {
      req.flash("error", "Your cart is empty");
      return res.redirect("/user/cart");
    }

    const user = await findUserWithId(req, res);
    const userId = user._id;

    const selectedAddressId = req.body.selectedAddressId;
    const paymentMethod = req.body.paymentMethod;
    const amount = cart.totalPrice;

    console.log("delivery address:", selectedAddressId);
    console.log("payment method:", paymentMethod);
    console.log("amount:", amount);

    if (!selectedAddressId || !paymentMethod || !amount) {
      console.error("Required fields are missing");
      req.flash("error", "Please provide all required fields");
      return res.redirect("/user/cart");
    }

    const selectedAddress = await Address.findOne({ _id: selectedAddressId });
    console.log("selected address:", selectedAddress);

    // Assuming the selectedAddress object has street, city, state, and zip fields
    const deliveryAddress = `${selectedAddress.userName},${selectedAddress.houseName},${selectedAddress.street},${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.zip}`;

    const items = cart.items.map((item) => ({
      product: item.productId,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
    }));

    console.log("items:", items);

    const newOrder = new Order({
      orderId: uuidv4(),
      user: userId,
      username: user.username,
      items: items,
      orderStatus: "Pending",
      deliveryAddress: deliveryAddress,
      amount: amount,
      paymentOption: paymentMethod,
    });

    await newOrder.save();

    console.log("mapped items:", items);

    items.forEach((item) => {
      console.log("productId:", item.product);
    });

    console.log("items after forEach:", items);

    // Decrement the product quantities
    for (const item of items) {
      await Product.findOneAndUpdate(
        { _id: item.product, "sizes.size": item.size },
        { $inc: { "sizes.$.quantity": -item.quantity } },
        { new: true }
      );
    }

    // Clear the cart in the session
    await Cart.findOneAndDelete({ _id: cart._id });
    req.session.cart = null;

    // Redirect to the order confirmation page
    req.flash("success", "Order placed successfully");
    res.render("user/thankyou", { order: newOrder });
  } catch (error) {
    console.error("Error saving order:", error);
    req.flash("error", "An error occurred while placing the order");
    res.redirect("/user/cart");
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    console.log("inside getUserProfile");

    const { email, username, phoneNumber } = req.session.user;
    res.render("user/user-profile", { email, username, phoneNumber });
  } catch (err) {
    console.error("error in getting user profile", err);
  }
};

exports.editUserProfile = async (req, res) => {
  try {
    console.log("inside edit user endpoint");
    const userId = req.session.user;
    const { username, email, phoneNumber } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email, phoneNumber },
      { new: true }
    );
    if (updatedUser) {
      res.json(updatedUser);
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
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("items.product")
      .exec();
    res.render("user/my-orders", { orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    req.flash("error", "Unable to fetch orders");
    res.redirect("/user/index");
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    await Order.findByIdAndUpdate(orderId, { orderStatus: "Cancelled" });
    req.flash("success", "Order cancelled successfully");
    res.redirect("/user/my-orders");
  } catch (error) {
    console.error("Error cancelling order:", error);
    req.flash("error", "Unable to cancel order");
    res.redirect("/user/my-orders");
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
    const { username, password, confirmPassword, email, phoneNumber } =
      req.body;
    // console.log(username,password,confirmPassword,email,phoneNumber);
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      res.redirect("/user/login");
    } else {
      if (password === confirmPassword) {
        // console.log(password,confirmPassword);
        const hashedPassword = await bcrypt.hash(password, 6);
        const data = { username, password: hashedPassword, email, phoneNumber };
        // console.log(data);
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
        // await User.insertMany([data])
        // res.status(200).send("Successful in registering an user")
        // return res.redirect("/user/otp")
      } else {
        res.redirect("/user/register");
        res.status(401).send("Password not matched");
      }
    }
  } catch (err) {
    console.error("Error in registering user", err);
  }
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
    console.log("req.session.userId:", req.session.userId);
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
    if (!req.session.isAuth) {
      return res.redirect("/user/login");
    }
    req.session.isAuth = false;
    return res.redirect("/user/login");
  } catch (err) {
    console.error("Error in logging out", err);
    return res.redirect("/user/login");
  }
};
