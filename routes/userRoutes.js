const express=require('express')
const userControllers=require('../controllers/userController')
const protectRoute=require('../middlewares/userAuth')
const router=express.Router();
require('../auth')

router.get("/index",protectRoute.isNotAuth,userControllers.getHomePage)

router.get("/shop",userControllers.getShopPage)

router.get("/product-details",userControllers.getProductDetailsPage)

router.post("/add-cart",userControllers.postAddToCart)

router.get("/cart",userControllers.getCartPage)

router.get("/user-profile",userControllers.getUserProfile)

router.put("/user-profile",userControllers.editUserProfile)

router.get("/address",userControllers.getAddress)

router.post("/address",userControllers.postAddress)

router.put("/address/:id",userControllers.editAddress)

router.delete("/address/:id",userControllers.deleteAddress)

router.get("/register",userControllers.getRegisterPage)

router.post('/register',userControllers.postRegisterPage)

router.get("/otp",protectRoute.ifLogged,userControllers.getOtp)

router.post("/otp",userControllers.postOtp)

router.get("/resend-otp",userControllers.getResendOtp)

router.get("/login",userControllers.getLoginPage)

router.post('/login',userControllers.postLoginPage)

router.get('/checkout',userControllers.getCheckoutPage)


module.exports=router;