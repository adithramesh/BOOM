const Product = require('../models/products');
const User=require('../models/users');
const Category=require('../models/categories')
const multer=require('multer')
const bcrypt=require('bcrypt')

exports.getLoginPage=((req,res)=>{
    try{
      
        if(req.session.isAuth){
            return res.redirect('/admin/dashboard')
        }else {
            console.log('else case in get admin login page');
            return res.render('admin/login')
        }
        
    }
    catch(err){
        console.error('Error in getting admin login page',err);
        res.render('admin/login')
    }
    
})

exports.postLoginPage=(async(req,res)=>{
    try{
        console.log("inside post admin login page");
        const {email,password}= req.body
        const admin=await User.findOne({email})
        if(!admin){
            console.log("inside post admin with invalid admin");
            return res.redirect('/admin/login')
        }
        if(admin.isAdmin==true && await bcrypt.compare(password,admin.password)){
            req.session.isAuth=true;
        return res.redirect("/admin/dashboard")
    }
        }
    catch(err){
        console.error('Error in logging in as an admin',err);
        res.redirect('/admin/login')
    }
})

exports.getDashboardPage=((req,res)=>{
    try{
        if(req.session.isAuth){
            console.log("inside admin dashboard page");
            return res.render("admin/dashboard")
        }else{
            res.redirect('/admin/login')
        }
    }catch(err){
        console.error('Getting error in dashboard',err);
        res.redirect('/admin/login')
    }
    
})

exports.getCustomers=async(req,res)=>{
    try{
    const users=await User.find().exec()
    res.render('admin/customers',{users})

    }catch(err){
        console.error("error fetching customers",err);

    }
}

exports.postUpdateCustomerStatus=(async(req,res)=>{
    try{
        const {userId}=req.body
        const user=await User.findById(userId)
        if(!user){
            return res.status(200).send("user not found")
        }else{
            user.isBlocked=!user.isBlocked;
            await user.save();
            return res.redirect('/admin/customers')
        }

    }catch(err){
        console.error("error in updating the status of the customer",err);
        res.redirect('/admin/dashboard')
    }
})

exports.getProductPage=(async(req,res)=>{
    try{
        const products = await Product.find().populate('category').exec();
        console.log("inside product page");
        res.render("admin/products",{products})
    }catch(err){
        console.error('Error in getting product page',err);
    }
    
})

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/admin/uploads/'); // Specify the desired destination directory
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });

  // Define file filter function
const fileFilter = (req, file, cb) => {
    // Check file mimetype to allow only images
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Only images are allowed')); // Reject the file
    }
};



  const upload = multer({ storage: storage, fileFilter: fileFilter });

 exports.upload=upload;


  exports.getAddProducts=(async(req,res)=>{
    try {
        // Define categories and subcategories
        // const preCategories = [
        //     { name: "Men's Clothing", subcategories: ["Shirts", "Pants", "Jackets", "Suits", "Activewear"] },
        //     { name: "Women's Clothing", subcategories: ["Dresses", "Tops", "Skirts", "Pants", "Activewear"] },
        //     { name: "Accessories", subcategories: ["Hats", "Belts", "Scarves", "Gloves", "Socks"] },
        //     { name: "Shoes", subcategories: ["Sneakers", "Boots", "Sandals", "Dress Shoes", "Athletic Shoes"] },
        //     { name: "Bags & Backpacks", subcategories: ["Handbags", "Shoulder Bags", "Backpacks", "Tote Bags", "Wallets"] },
        //     { name: "Sale & Clearance", subcategories: ["Discounted Items", "Clearance Sales"] }
        // ];

        const categories=await Category.find()
        // const categories=[...preCategories,...dbCategories]
       
        res.render('admin/add-products', { categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
  })

  exports.postUpdateProductStatus=(async(req,res)=>{
    try{
        const {productId}=req.body
        const product=await Product.findById(productId)
        if(!product){
            return res.status(200).send("product not found")
        }else{
            product.isBlocked=!product.isBlocked;
            await product.save();
            return res.redirect('/admin/products')
        }

    }catch(err){
        console.error("error in updating the status of the customer",err);
        res.redirect('/admin/dashboard')
    }
})

exports.getEditProduct=async(req,res)=>{
    try {
        const product = await Product.findById(req.params.id);
        const categories = await Category.find();
        res.render('admin/edit-product', { product, categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
exports.postEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        console.log("productId:", productId); 
        let images;
        console.log("req.file",req.files);
        if(req.files && req.files.length>0){
         images = req.files.map(file => '/admin/uploads/'+ file.filename); // Assuming files are saved with path
        } else if (req.file){
          images=req.file.filename
        } else{
          images=[]  //no files uploaded
        }
        console.log("images:",images);
        const {name,description,price,quantity,sizes,colour,category}=req.body

        if (!name || !description || !price || !colour || !quantity || !category || !sizes) {
            req.flash('error', "All fields shall be filled properly");
            return res.redirect(`/admin/edit-product/${productId}`);
        }

        
      const updatedProduct = {
        name,
        description,
        price,
        colour,
        quantity,
        size: Array.isArray(sizes) ? sizes : [sizes],// Ensure size is an array
        category,
        images
      };

      console.log("updated products:",updatedProduct);
        await Product.findByIdAndUpdate(productId, updatedProduct);
        req.flash('success','Product editted successfully')
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.postAddProducts = async (req, res) => {
    try {
        const { name, description, price, colour, quantity, category, sizes } = req.body;

        if (!name || !description || !price || !colour || !quantity || !sizes  || !category) {
            req.flash('error', "All fields shall be filled properly");
            return res.redirect('/admin/add-product');
        }

        console.log("req.files", req.files);

        let images;
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => '/admin/uploads/' + file.filename); // Assuming files are saved with path
        } else if (req.file) {
            images = ['/admin/uploads/' + req.file.filename];
        } else {
            images = [];  // No files uploaded
        }

        const newProduct = {
            name,
            description,
            price,
            colour,
            quantity,
            category,
            images,
            size: Array.isArray(sizes) ? sizes : [sizes] // Ensure size is an array
        };

        console.log("new product:", newProduct);

        await Product.create(newProduct);
        res.redirect("/admin/products");
        // res.status(201).json(newProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

  async function countProductsForCategory(categoryId) {
    try {
        const count = await Product.countDocuments({ category: categoryId });
        return count;
    } catch (error) {
        console.error('Error counting products for category:', error);
        return 0; // Return 0 if there's an error
    }
}


exports.getCategories=async(req,res)=>{
    try{
        let categories= await Category.find().populate('products').exec()
        
        // console.log("categories",categories);

        const countPromises=categories.map(async category=>{
            const productCount= await countProductsForCategory(category._id);
            return {...category.toJSON(), productCount}
        })

        const categoriesWithProductCount= await Promise.all(countPromises)
        // console.log("categoryCount:",categoriesWithProductCount);
        return res.render('admin/categories',{categories, categoriesWithProductCount})
    }catch(err){
        console.error("Error in fetching categories",err);
    }
   
}

exports.getEditCategory=async(req,res)=>{
    try {
        const category = await Category.findById(req.params.id);
    
        res.render('admin/edit-category', { category });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

exports.postEditCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Update the product in the database using req.body
        await Category.findByIdAndUpdate(categoryId, req.body);

        // Redirect or send a response indicating success
        res.redirect("/admin/categories");
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.postUpdateCategoryStatus=(async(req,res)=>{
    try{
        const {categoryId}=req.body
        const category=await Category.findById(categoryId)
        if(!category){
            return res.status(200).send("product not found")
        }else{
            category.isBlocked=!category.isBlocked;
            await category.save();
            return res.redirect('/admin/categories')
        }

    }catch(err){
        console.error("error in updating the status of the customer",err);
        res.redirect('/admin/dashboard')
    }
})


exports.getAddCategories=(req,res)=>{
    try{
        res.render('admin/add-category');
    }catch(err){
        console.error("error in adding category",err);
    }
}

exports.postAddCategories=async(req,res)=>{
    try{
        const name=req.body.name
        console.log("name", name);
        const existingCategory= await Category.findOne({name:{ $regex: new RegExp(`^${name}$`, 'i') }}).exec()
        console.log(existingCategory);
        if(existingCategory){
            req.flash("error", "Category with same name already exists!")
            return res.redirect('/admin/add-category')
        }else{
            await Category.create(req.body)
            
            res.redirect('/admin/categories')
        }
    }catch(err){
        console.error("error in posting new category",err);
    }
}


exports.getLogoutPage=(req,res)=>{
    try {
       
        if (!req.session.isAuth) {
            return res.redirect('/admin/login');
        }
        req.session.isAuth = false;
        return res.redirect('/admin/login');
    } catch (err) {
        console.error("Error in logging out", err);
        return res.redirect('/admin/login');
    }
}

