const express=require('express')
const flash=require('express-flash')
const User=require('../models/users')
const passport=require('passport')
require('../auth')


exports.authGoogle=(passport.authenticate('google',{scope:['email','profile']}))

exports.authGoogleCallback = [
    (req, res, next) => {
        passport.authenticate('google', { failureRedirect: '/user/login' })(req, res, next);
    },
    (req, res) => {
        console.log("inside auth google callback");
        res.redirect("/user/index");
    },
    (err, req, res, next) => {
        console.error(err);
        res.redirect('/user/login');
    }
];



// exports.authGoogleCallback=(req,res)=>{
//     res.send("hello")
// }
exports.authFacebook=(req,res)=>{console.log("inside authFB");(passport.authenticate('facebook',{scope:['email','profile']})(req,res))};

exports.authFacebookCallback=(passport.authenticate('facebook',{failureRedirect:'/user/login'}),
(req,res)=>{
    console.log("inside auth facebook callback");
    res.redirect("/user/checkout")},
(err,req,res,next)=>{
console.error(err);
res.redirect('/user/login')
})

exports.sample=(req,res)=>{
    res.send("Hello World")
}