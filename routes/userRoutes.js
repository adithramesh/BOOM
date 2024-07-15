const express=require('express')
const userControllers=require('../controllers/userController')
const protectRoute=require('../middlewares/userAuth')
const router=express.Router();
require('../auth')

router.get("/index",protectRoute.isNotAuth,userControllers.getHomePage)

router.get("/shop",userControllers.getShopPage)

router.post("/shop",userControllers.postShopPage)

router.get("/product-details",userControllers.getProductDetailsPage)

router.get("/wishlist",userControllers.getWishlistPage)

router.post("/add-wishlist",userControllers.postAddToWishList)

router.post("/add-cart",protectRoute.isBlocked,userControllers.postAddToCart)

router.delete("/remove-wishlist",protectRoute.isBlocked,userControllers.removeFromWishlist)

router.get("/cart",protectRoute.isBlocked,userControllers.getCartPage)

router.get("/cart/remove",userControllers.removeCartItems)

router.post('/cart/update-quantity',userControllers.updateCartQuantity)

router.post('/apply-coupon',userControllers.postApplyCoupon)

router.post('/remove-coupon',userControllers.postRemoveCoupon)

router.get("/proceed-checkout",userControllers.getProceedToCheckout)

router.post("/create-razorpay-order",userControllers.createRazorpayOrder)

router.post("/orders/status",userControllers.postOrderStatus)

router.post("/orders/retry-payment/:id",userControllers.retryPayment)

router.get("/thankyou",userControllers.getThankYouPage)

router.get("/user-profile",protectRoute.isAuth,protectRoute.isBlocked,userControllers.getUserProfile)

router.post("/user-profile",userControllers.editUserProfile)

router.get('/my-orders', userControllers.getOrders);

router.post('/orders/update-status/:id', userControllers.postUpdateOrderStatus);

router.get('/orders/download-invoice/:id', userControllers.downloadInvoice);

router.get('/reset-password',userControllers.getResetPassword)

router.post('/reset-password',userControllers.postResetPassword)

router.get('/wallet',userControllers.getWallet)

router.get("/address",userControllers.getAddress)

router.post("/address",userControllers.postAddress)

router.put("/address/:id",userControllers.editAddress)

router.delete("/address/:id",userControllers.deleteAddress)

router.get("/register",userControllers.getRegisterPage)

router.post('/register',userControllers.postRegisterPage)

router.get("/otp",protectRoute.isOtp,userControllers.getOtp)  

router.post("/otp",userControllers.postOtp)

router.get("/resend-otp",userControllers.getResendOtp)

router.get("/login",userControllers.getLoginPage)

router.post('/login',userControllers.postLoginPage)

router.get("/forgot-password",userControllers.getForgotPasswordPage)

router.post("/forgot-password",userControllers.postForgotPasswordPage)

router.get("/reset-password-login",userControllers.getResetPasswordAtLogin)

router.post("/reset-password-login",userControllers.postResetPasswordAtLogin)

router.get('/logout',protectRoute.noCache,protectRoute.isAuth,userControllers.getlogoutPage)


module.exports=router;