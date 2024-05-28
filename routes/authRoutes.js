const express=require('express')
const router=express.Router()
const authControllers=require('../controllers/authController')

router.get("/auth/google",authControllers.authGoogle)

router.get("/auth/google/callback",authControllers.authGoogleCallback)

router.get("/auth/facebook",authControllers.authFacebook)

router.get("/auth/facebook/callback",authControllers.authFacebookCallback)

router.get("/auth/sample",authControllers.sample)

module.exports=router;