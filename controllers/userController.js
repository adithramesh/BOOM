const express=require('express')
const flash=require('express-flash')
const bcrypt=require('bcrypt')
const User=require('../models/users')
const UserOtpModel=require('../models/otp')
const Product=require('../models/products')
const passport=require('passport')
const otpGenerator=require('otp-generator')
const nodemailer=require('nodemailer')
const Category = require('../models/categories')
const Address=require('../models/address')
const Cart=require('../models/cart')
require('dotenv').config()
require('../auth')


exports.getHomePage=((req,res)=>{
    try{
        console.log("inside homepage");
        if(req.session.isAuth || req.session.signup){
                req.session.signup=false
               return res.render('user/index')
               
        }else{
            res.redirect('/user/login')
        }
    }catch(err){
        console.error("error in getting index page",err);
        res.redirect('/user/login')
    }
    
})

exports.getShopPage=(async(req,res)=>{
    try{
    console.log("inside shop page");
    
    const  categories=await Category.find({isBlocked:false})
    const categoriesNotBlockedId=categories.map(category=>category._id)
    const products=await Product.find({category:{$in:categoriesNotBlockedId},isBlocked:false})

    // console.log("products:",products);
    // console.log("category:",categories);
    res.render('user/shop',{products})
    }catch(err){
        console.error("error in fetching products",err);
    }
})    


exports.getProductDetailsPage=(async(req,res)=>{
    try{
        console.log("inside product details page");
        const productId=req.query.id;
        console.log("product id;",productId);
        const productDetails=await Product.findById(productId)
        console.log("product details:",productDetails);
        res.render("user/product-details",{productDetails});
    }catch(err){
        console.error("error in getting product details",err);
        res.status(500).send("Internal Server Error");
    }
})

exports.postAddToCart=(async(req,res)=>{
try{
    console.log("inside post add to cart");
    const userId=req.session.user._id
    const{productId,size,quantity}=req.body

    const product=await Product.findById(productId)
    if(!product){
        return res.status(404).json({ error: 'Product not found' });  
    }

    const amount=product.price*quantity;

    let cart=await Cart.findOne({userId})
    if(!cart){
        cart= new Cart({userId, items:[],totalPrice:0})
    }

    const existingItemIndex = cart.items.findIndex(item=>item.productId.toString()===productId && item.size===size);
    if(existingItemIndex>-1){
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].amount += amount;
    }else{
        cart.items.push({
            productId: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            images: product.images,
            quantity,
            size,
            colour: product.colour,
            amount
        })
    }

    cart.totalPrice += price*quantity
    console.log("cart:", cart);
    await cart.save();
    res.redirect('/user/cart')
}catch(err){
    console.error("Error in adding products to the cart");
    res.status(500).json({ error: 'Internal server error' });
}
})

exports.getCartPage=(async(req,res)=>{
    try{
        const userid=req.session.user._id
        const cart= await Cart.findOne(userId).populate('items.productId');
        res.render('user/cart',{cart});
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

exports.getUserProfile=(async (req,res)=>{
    try{
        console.log('inside getUserProfile');
        if(!req.session.isAuth){
            res.redirect('/user/login') 
        }
            const {email,username,phoneNumber}=req.session.user
        res.render('user/user-profile',{email,username,phoneNumber})
         
    }catch(err){
        console.error("error in getting user profile",err);
    }
   
})

exports.editUserProfile=(async(req,res)=>{
    try{
        console.log("inside edit user endpoint");
        const userId=req.session.user
        const {username,email,phoneNumber}=req.body
        const updatedUser= await User.findByIdAndUpdate(userId,{username,email,phoneNumber},{new:true})
        if(updatedUser){
            res.json(updatedUser)
        }else{
            res.status(404).send('User not updated');
        }
        
    }catch(err){
        console.error("Error in updating user details",err);
        res.status(500).send('Internal Server Error');
    }
})

async function findUserWithId(req,res){
    const userId=req.session.userId;
    const existingUser= await User.findOne({ _id: userId })
    return existingUser
}

exports.getAddress=(async(req,res)=>{
    try{
        const user= await findUserWithId(req,res)
        userId=user._id
        const savedAddress= await Address.find({userId:userId})
        console.log("inside getAddress with savedAddress");
        // console.log("savedAddress:", savedAddress);
        res.render('user/address',{user,savedAddress})
    }catch(err){
        console.error("Error in getting users address",err);
    }
})

exports.postAddress=(async(req,res)=>{
    try{
        console.log("inside post address");
        const {userName,addressType,houseName, street, city, state, country, zipCode}=req.body
        const userId=req.session.userId;
        console.log("userId:",userId);
        const newAddress={
            userId,userName,addressType,houseName, street, city, state, country, zipCode
        }
        await Address.create(newAddress)
        // res.redirect('/user/address')
        res.status(201).json(newAddress);
    }catch(err){
        console.error("Error in posting Address", err);
    }
})

exports.editAddress=(async(req,res)=>{
    try{
        console.log("inside edit address");
        const id = req.params.id;
        console.log("req.params.id:",id);
        const updatedAddress = req.body;
        console.log("updatedAddress:",updatedAddress);
        const address = await Address.findByIdAndUpdate(id, updatedAddress, { new: true });
        
        if (address) {
            res.json(address);
        } else {
            res.status(404).send('Address not found');
        }
    }catch(err){
        res.status(500).send('Internal server error');
    }
})

exports.deleteAddress=(async(req,res)=>{
    try{
        console.log("inside delete address");
        const id = req.params.id;
        const address = await Address.findByIdAndDelete(id);
        if (address) {
            res.status(204).send();
        } else {
            res.status(404).send('Address not found');
        }
        }catch(err){
            res.status(500).send('Internal server error');
    }
})

exports.getRegisterPage=((req,res)=>{
    console.log("inside getRegisterPage");
    const error=req.query.error
    res.render("user/register",{error})
})

exports.postRegisterPage=async(req,res)=>{
    try{
        console.log('inside postRegisterPage');
        const {username,password,confirmPassword,email,phoneNumber}=req.body;
        // console.log(username,password,confirmPassword,email,phoneNumber);
        const existingUser=await User.findOne({email:email})
        if(existingUser){
            res.redirect('/user/login');
        }else{
            if(password===confirmPassword){
                // console.log(password,confirmPassword);
            const hashedPassword=await bcrypt.hash(password,6)
            const data={username,password:hashedPassword,email,phoneNumber}
            // console.log(data);
            req.session.user=data;
            console.log(req.session.user);
            req.session.signup=true;

            const otp=generateOtp();
            const currTime=Date.now();
            const expTime=currTime+(60*1000);
            await UserOtpModel.updateOne({email:email},{$set:{email,otp,expiry:new Date(expTime)}},{upsert:true});
            await sendmail(email,otp);    
            return res.redirect('/user/otp')
            // await User.insertMany([data])
            // res.status(200).send("Successful in registering an user")
            // return res.redirect("/user/otp")
        }else{
            res.redirect('/user/register')
            res.status(401).send("Password not matched")
        }
        }
    }catch(err){
        console.error("Error in registering user",err);
    }

}

function generateOtp(){
    try{
        const otp=otpGenerator.generate(4, {
            upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false
        })
        console.log("OTP :",otp);
        return otp;

    }catch(err){
        console.error("Error in generating OTP",err);
        res.redirect('user/register')
    }
}

const sendmail=async(email,otp)=>{
try{
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: "adithramesh90@gmail.com",
          pass: "bale rnnj krbj sech"
        },
      });

      const mailContent={
            from: 'BOOM<adithramesh90@gmail.com>',
            to: email,
            subject: 'E-mail Verification',
            html: `<p>Dear User,</p>
           <p>Thank you for registering with BOOM! To complete your registration, please use the following<br> <span style="font-weight: bold; color: #ff0000;">OTP: ${otp}</span></p>
           <p>Enter this OTP on our website to verify your email address and access your account.</p>
           <p>Kindly ingore this email if you do not want to register with us.</p>
           <p>Welcome to BOOM!</p>
           <p>Best regards,<br/>BOOM Apparels</p>`
      }

      await transporter.sendMail(mailContent);
      console.log("Email sent successfuly");

}catch(err){
    console.error("Error in sending mail",err);
}
}

exports.getOtp=((req,res)=>{
    try{
        if(req.session.signup){
            res.render('user/otp')
        }else if(req.session.iAuth){
            console.log('session activated');
            res.redirect('/user/index')
        }
        else{
            res.redirect('/user/index')
        }
        
        }
    catch(err){
        console.error('Error in generating OTP');
        res.redirect('/user/register')
    }
})

exports.postOtp=(async(req,res)=>{
    console.log("inside postsOtpPage");
    try{
        const enteredOtp=req.body.otp;
        const user=req.session.user;
        const email=req.session.user.email;
        // console.log(enteredOtp,user,email);
        const otpUser=await UserOtpModel.findOne({email})
        otpInDb=otpUser.otp;
        console.log("entered otp:",enteredOtp);
        console.log("OTP in db",otpInDb);
        const expiry=otpUser.expiry;
        if (enteredOtp != otpInDb || expiry.getTime() < Date.now()) {
            console.log("wrong OTP or time expired");
            req.flash('error', 'Entered wrong OTP or time expired. Please regenerate OTP.');
            return res.redirect('/user/otp');
        }
        if(enteredOtp==otpInDb && expiry.getTime()>=Date.now()){
            console.log("enetered if cond");
            user.isVerified=true;
            console.log("user verified");
            if(req.session.signup){
            await User.create(user)
            req.session.isAuth=true
            return res.redirect("/user/index")
            }else{
                req.flash('otperror','Entered wrong OTP or Time expired')
            }
        }
    }catch(err){
        console.error("OTP verification error",err);
        res.redirect('/user/register')
    }
})

exports.getResendOtp=(async(req,res)=>{
    try{
        const email=req.session.user.email
        console.log('resend otp mail:',email);
        console.log("inside resend otp");
        const otp=generateOtp();
        const currTime=Date.now();
        const expTime=currTime+(60*1000);
        await UserOtpModel.updateOne({email:email},{$set:{email,otp,expiry:new Date(expTime)}},{upsert:true});
        await sendmail(email,otp);    
        return res.redirect('/user/otp')
    }catch(err){
        console.error("Error in resending OTP",err);
        res.redirect('/user/login')
    }
})

exports.getLoginPage=((req,res)=>{
    
        if(req.session.isAuth){
            console.log('session activated');
            return res.redirect('/user/index');
        }
       
        else{
            console.log("inside get login page");
            res.render("user/login", { expressFlash: req.flash() }); 
        }
        
        // console.error("Error rendering login page:", error);
        // res.status(500).send("Error rendering login page");
        
    
})

exports.postLoginPage=(async(req,res)=>{
    try{
        console.log("inside postLoginPage");
        const {email,password}=req.body;
        const user =await User.findOne({email})
        console.log(user);
        // req.session.userId=user._id;
        if(!user){
           return res.redirect('/user/register?error=notfound')
        }
        if(user.isBlocked==false && await bcrypt.compare(password,user.password)){
            req.session.user=user;
            req.session.isAuth=true;
            req.session.userId=user._id;
            console.log('req.session.userId',req.session.user._id);
            return res.redirect("/user/index")
        }
    }catch(err){
        console.error("some error in logging in",err);
        res.redirect('/user/login')
    }
    
})



exports.getCheckoutPage=((req,res)=>{
    try {
       
        if (!req.session.isAuth) {
            return res.redirect('/user/login');
        }
        req.session.isAuth = false;
        return res.redirect('/user/login');
    } catch (err) {
        console.error("Error in logging out", err);
        return res.redirect('/user/login');
    }
})
