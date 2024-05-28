const passport=require('passport')
const User=require('./models/users');
const { authGoogleCallback } = require('./controllers/userController');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const FacebookStrategy=require('passport-facebook').Strategy;
require('dotenv').config()

//Google
passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback   : true
  },
  async function(request, accessToken, refreshToken, profile, done) 
 {
  try{
    let user=await User.findOneAndUpdate(
      {email: profile.emails[0].value},
      {$setOnInsert:{username:profile.displayName}},
      {upsert:true, new:true}
    );
    return done(null,user)
  }catch(err){
      console.error("Error loggin in via Google",err);
      return done(err);
  }
 }
));

passport.serializeUser((user,done)=>{
  return done(null,user)
})

passport.deserializeUser((user,done)=>{
  return done(null,user)
})




//Facebook
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/callback"
},
async function(accessToken, refreshToken, profile, cb) {
try{
let user= await User.findOneAndUpdate(
  {email:profile.emails[0].value},
  {$setOnInsert:{username:profile.displayName}},
  {upsert:true, new:true}
);
return cb(null,profile)
}catch(err){
console.error("Error in logging in via Facebook",err);
return cb(err);
}
}
));

