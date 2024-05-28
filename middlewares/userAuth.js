exports.isAuth=(req,res,next)=>{
    try{
        if(!req.session.isAuth){
            res.redirect('/user/login')
        }
    }catch(err){
        console.error("Error in admin session",err);
        res.redirect('/user/login')
    }
 
}

exports.isNotAuth=(req,res,next)=>{
    try{
        if(!req.session.isAuth){
            res.render('user/index')
        }else{
            next()
        }
    }catch(err){
        console.error("Error in admin session",err);
        res.redirect('/user/login')
    }
 
}



exports.ifLogged=(req,res,next)=>{
    try{
        if(!req.session.userId){
            next();
        }else{
            res.redirect('/user/index')
        }
        }catch(err){
            console.error("Error in admin session",err);
            res.redirect('/user/login')
        }
    }
