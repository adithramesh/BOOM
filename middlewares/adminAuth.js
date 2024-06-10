exports.isAuth=(req,res,next)=>{
    try{
        if(!req.session.isAdAuth){
            res.redirect('/admin/login')
        }else{
            next();
        }
    }catch(err){
        console.error("Error in admin session",err);
        res.redirect('/admin/login')
    }
 
}