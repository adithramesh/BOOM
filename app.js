const express=require('express');
const mongoose=require('mongoose');
const session=require('express-session');
const flash=require('express-flash');
const path=require('path');
const passport=require('passport')
const nocache=require('nocache')
require('dotenv').config()
require('./auth')



//DB connection
mongoose.connect(process.env.MONGO_URL)
.then(()=>{console.log("Connected to MongoDB server")})
.catch((error)=>{console.log("Error in connecting MongoDB server",error)})

const app=express();

//Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  // cookie: { secure: true }, // You may want to set secure to true if your app is served over HTTPS
}))

//Middlewares
app.use(express.urlencoded({extended:true}));
app.use(express.json())
app.use(nocache())
app.use(passport.initialize());
app.use(passport.session())
app.use(flash());

//static files middleware
app.use('/',express.static(path.join(__dirname, 'public', 'user')))
app.use('/user', express.static(path.join(__dirname, 'public','user')))
app.use('/admin', express.static(path.join(__dirname,'public','admin')))
app.use("/admin/uploads", express.static(path.join(__dirname, "public", "admin", "uploads")));



//view engine
app.set('view engine','ejs')  
app.set('views',path.join(__dirname,'views'));


//route middleware
const userRouter=require('./routes/userRoutes');
const adminRouter=require('./routes/adminRoutes');
const authRouter=require('./routes/authRoutes')

app.use('/user',userRouter);
app.use('/admin',adminRouter);
app.use('/',authRouter);

//error handling middleware
app.use((err,req,res,next)=>{
    console.log(err.stack);
    res.status(500).send("Internal server error")
})

//server
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>{console.log(`Server listening to port ${PORT}`)});