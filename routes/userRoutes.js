const express=require('express')
const userControllers=require('../controllers/userController')
const protectRoute=require('../middlewares/userAuth')
const router=express.Router();
require('../auth')

router.get("/index",protectRoute.isNotAuth,userControllers.getHomePage)

router.get("/shop",userControllers.getShopPage)

router.get("/product-details",userControllers.getProductDetailsPage)

router.post("/add-cart",protectRoute.isBlocked,userControllers.postAddToCart)

router.get("/cart",protectRoute.isBlocked,userControllers.getCartPage)

router.get("/cart/remove",userControllers.removeCartItems)

router.post('/cart/update-quantity',userControllers.updateCartQuantity)

router.get("/proceed-checkout",userControllers.getProceedToCheckout)

router.post("/orders/status",userControllers.postOrderStatus)

router.get("/user-profile",protectRoute.isBlocked,userControllers.getUserProfile)

router.put("/user-profile",userControllers.editUserProfile)

router.get('/my-orders', userControllers.getOrders);

router.get('/orders/cancel/:id', userControllers.cancelOrder);

router.get('/reset-password',userControllers.getResetPassword)

router.post('/reset-password',userControllers.postResetPassword)

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

router.get('/logout',userControllers.getlogoutPage)


module.exports=router;