const Product = require('../models/products');
const User=require('../models/users');
const Category=require('../models/categories')
const Address=require('../models/address')
const Order=require('../models/order')
const Coupon = require('../models/coupon');
const multer=require('multer')
const bcrypt=require('bcrypt')
const mongoose = require('mongoose');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;




exports.getLoginPage=((req,res)=>{
    try{
      
        if(req.session.isAdAuth){
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
        console.log("admin:",admin);
        if(admin.isAdmin===false){
            console.log("inside post admin with invalid admin");
            req.flash('error','You are not an Admin')
            return res.redirect('/admin/login')
        }

        if(admin.isBlocked){
            req.flash('error', 'Your account is blocked');
            req.session.destroy(); // Clear any existing session
            return res.redirect('/admin/login');
        }
        const isCorrectPassword=await bcrypt.compare(password,admin.password)
        if(!isCorrectPassword){
            req.flash('error','Password do not match')
            return res.redirect('/admin/login')
        }

        // if everything is correct       
        req.session.isAdAuth=true;
        return res.redirect("/admin/dashboard")
 
        }
    catch(err){
        console.error('Error in logging in as an admin',err);
        res.redirect('/admin/login')
    }
})


// exports.getDashboardPage = async (req, res) => {
//     try {
//         if (req.session.isAdAuth) {
//             // Fetch total number of products
//             const totalProducts = await Product.countDocuments({});
//             const totalOrders = await Order.countDocuments({})
//             const totalCategories = await Category.countDocuments({})
//             // Calculate total revenue from orders
//             const orders = await Order.find({});
//             const totalRevenue = orders.reduce((acc, order) => acc + order.amount, 0);

           
//             // Get top-selling products
//             const topSellingProducts = await Order.aggregate([
//                 { $match: { orderStatus: 'delivered' } },
//                 { $unwind: "$items" },
//                 {
//                     $group: {
//                         _id: "$items.product",
//                         totalQuantity: { $sum: "$items.quantity" },
//                     }
//                 },
//                 { $sort: { totalQuantity: -1 } },
//                 { $limit: 5 },
//                 {
//                     $lookup: {
//                         from: "products",
//                         localField: "_id",
//                         foreignField: "_id",
//                         as: "product"
//                     }
//                 },
//                 { $unwind: "$product" }
//             ]);

//             // Get top-selling categories
//             const topSellingCategories = await Order.aggregate([
//                 { $match: { orderStatus: 'delivered' } },
//                 { $unwind: "$items" },
//                 {
//                     $lookup: {
//                         from: "products",
//                         localField: "items.product",
//                         foreignField: "_id",
//                         as: "product"
//                     }
//                 },
//                 { $unwind: "$product" },
//                 {
//                     $group: {
//                         _id: "$product.category",
//                         totalQuantity: { $sum: "$items.quantity" },
//                     }
//                 },
//                 { $sort: { totalQuantity: -1 } },
//                 { $limit: 5 },
//                 {
//                     $lookup: {
//                         from: "categories",
//                         localField: "_id",
//                         foreignField: "_id",
//                         as: "category"
//                     }
//                 },
//                 { $unwind: "$category" }
//             ]);

//             console.log("top selling products:",topSellingProducts);
//             console.log("top selling categories:", topSellingCategories);

//             return res.render('admin/dashboard', {
//                 totalProducts,
//                 totalRevenue,
//                 totalOrders,
//                 totalCategories,
//                 topSellingProducts,
//                 topSellingCategories
//             });
//         } else {
//             res.redirect('/admin/login');
//         }
//     } catch (err) {
//         console.error('Getting error in dashboard', err);
//         res.redirect('/admin/login');
//     }
// };

exports.getDashboardPage = async (req, res) => {
    try {
        if (req.session.isAdAuth) {
            const totalProducts = await Product.countDocuments({});
            const totalOrders = await Order.countDocuments({});
            const totalCategories = await Category.countDocuments({});

            const orders = await Order.find({ orderStatus: 'delivered' });
            const totalRevenue = orders.reduce((acc, order) => acc + order.amount, 0);

           
            const pipelineTopSellingProducts = [
                // Unwind items array to denormalize
                {
                    $unwind: '$items',
                },
                // Group by product and sum quantities
                {
                    $group: {
                        _id: '$items.product', // Group by product _id
                        totalSold: { $sum: '$items.quantity' }, // Sum of quantities for each product
                    },
                },
                // Lookup to join with Products collection
                {
                    $lookup: {
                        from: 'products', // Assuming your collection name is 'products'
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productDetails',
                    },
                },
                // Unwind to destructure the array from lookup
                {
                    $unwind: '$productDetails',
                },
                // Project to shape the output
                {
                    $project: {
                        _id: 1,
                        totalSold: 1,
                        productName: '$productDetails.name',
                        productCategory: '$productDetails.category', // Assuming category is already populated
                        productImage: '$productDetails.images',
                        stockLeft: '$productDetails.sizes.quantity', // Adjust as per your schema
                    },
                },
                // Sort by totalSold descending
                {
                    $sort: { totalSold: -1 },
                },
                // Limit to top 10 products
                {
                    $limit: 10,
                },
            ];
            
            const topSellingProducts = await Order.aggregate(pipelineTopSellingProducts);
            console.log('Top Selling Products:', topSellingProducts);

            const pipelineTopSellingCategories = [
                // Unwind items array to denormalize
                {
                    $unwind: '$items',
                },
                // Lookup to join with Products collection
                {
                    $lookup: {
                        from: 'products', // Assuming your collection name is 'products'
                        localField: 'items.product',
                        foreignField: '_id',
                        as: 'productDetails',
                    },
                },
                // Unwind to destructure the array from lookup
                {
                    $unwind: '$productDetails',
                },
                // Lookup to join with Categories collection
                {
                    $lookup: {
                        from: 'categories', // Assuming your collection name is 'categories'
                        localField: 'productDetails.category',
                        foreignField: '_id',
                        as: 'categoryDetails',
                    },
                },
                // Unwind to destructure the array from lookup
                {
                    $unwind: '$categoryDetails',
                },
                // Group by category and sum quantities
                {
                    $group: {
                        _id: '$categoryDetails.name',
                        totalSold: { $sum: '$items.quantity' },
                        numProducts: { $addToSet: '$productDetails._id' }, // Get unique products
                    },
                },
                // Project to shape the output
                {
                    $project: {
                        _id: 1,
                        totalSold: 1,
                        numProducts: { $size: '$numProducts' }, // Count unique products
                    },
                },
                // Sort by totalSold descending
                {
                    $sort: { totalSold: -1 },
                },
                // Limit to top 10 categories
                {
                    $limit: 10,
                },
            ];
            
            const topSellingCategories = await Order.aggregate(pipelineTopSellingCategories);
            console.log('Top Selling Categories:', topSellingCategories);
            
            return res.render('admin/dashboard', {
                totalProducts,
                totalRevenue,
                totalOrders,
                totalCategories,
                topSellingProducts,
                topSellingCategories
             
            });
        } else {
            res.redirect('/admin/login');
        }
    } catch (err) {
        console.error('Getting error in dashboard', err);
        res.redirect('/admin/login');
    }
};


exports.postSalesReport = async (req, res) => {
    const { startDate, endDate } = req.body;

    try {
        const orders = await Order.find({
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        // Prepare sales report data
        const salesReportData = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((acc, order) => acc + order.amount, 0),
            totalDiscount: orders.reduce((acc, order) => acc + (order.discount || 0), 0),
            orders: orders.map(order => ({
                orderId: order.orderId,
                // date: order.date, // Format date to dd-mm-yyyy
                date: new Date(order.date).toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }), // Format date to dd-mm-yyyy
                amount: order.amount,
                discount: order.discount || 0
            }))
        };

        // Create PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        // Add headers
        page.drawText('BOOM Sales Report', { x: 50, y: height - 50, size: 18 });
        // page.drawText(`From: ${startDate} To: ${endDate}`, { x: 50, y: height - 70, size: 14 });
        page.drawText(`From: ${new Date(startDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })} To: ${new Date(endDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })}`, { x: 50, y: height - 70, size: 14 });

        const table = [
            // Headers
            ['Order ID', 'Date', 'Amount', 'Discount'],
            // Data rows
            ...salesReportData.orders.map((order, index) => [
                `${index + 1}. ${order.orderId}`, // Order ID with numbering
                `${order.date}`, // Date
                `Rs.${order.amount.toFixed(2)}`, // Amount
                `Rs.${order.discount.toFixed(2)}` // Discount
            ])
        ];
        
        const tableTopY = height - 120;
        const tableBottomY = 100;
        const tableHeight = table.length * 20; // Adjust row height as needed
        const tableWidth = 500; // Increased table width to accommodate orderId
        const cellPadding = 10;
        
        // Define custom column widths
        const columnWidths = [250, 100, 75, 75]; // Adjust column widths as needed
        
        // Draw table headers
        table.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const x = 50 + columnWidths.slice(0, colIndex).reduce((acc, width) => acc + width, 0);
                const y = tableTopY - (rowIndex + 1) * 20 - cellPadding;
                page.drawText(cell, { x, y, size: 12 });
            });
        });
        

        // Draw totals
        page.drawText(`Total Orders: ${salesReportData.totalOrders}`, { x: 300, y: tableTopY - table.length * 20 - 40, size: 12 });
        page.drawText(`Total Revenue: Rs.${salesReportData.totalRevenue.toFixed(2)}`, { x: 50, y: tableTopY - table.length * 20 - 60, size: 12 });
        page.drawText(`Total Discount: Rs.${salesReportData.totalDiscount.toFixed(2)}`, { x: 50, y: tableTopY - table.length * 20 - 80, size: 12 });

        // Save PDF to buffer
        const pdfBytes = await pdfDoc.save();

        // Send PDF as response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Error generating sales report', error);
        res.status(500).send('Error generating sales report');
    }
};



const excel = require('excel4node');

// Function to generate sales report in Excel
exports.getExcelSalesReport = async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        const orders = await Order.find({
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        // Prepare sales report data
        const salesReportData = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((acc, order) => acc + order.amount, 0),
            totalDiscount: orders.reduce((acc, order) => acc + (order.discount || 0), 0),
            orders: orders.map(order => ({
                orderId: order.orderId,
                date: order.date.toISOString().split('T')[0],
                amount: order.amount,
                discount: order.discount || 0
            }))
        };

        // Create a new instance of a Workbook class
        const wb = new excel.Workbook();

        // Add a Worksheet to the workbook
        const ws = wb.addWorksheet('Sales Report');

        // Create a reusable style
        const style = wb.createStyle({
            font: { color: '#000000', size: 12 },
            numberFormat: '₹#,##0.00; (₹#,##0.00); -',
        });

        // Set headers
        ws.cell(1, 1).string('Order ID').style(style);
        ws.cell(1, 2).string('Date').style(style);
        ws.cell(1, 3).string('Amount').style(style);
        ws.cell(1, 4).string('Discount').style(style);

        // Fill data
        salesReportData.orders.forEach((order, index) => {
            ws.cell(index + 2, 1).string(order.orderId).style(style);
            ws.cell(index + 2, 2).string(order.date).style(style);
            ws.cell(index + 2, 3).number(order.amount).style(style); // Ensure this is a number
            ws.cell(index + 2, 4).number(order.discount).style(style); // Ensure this is a number
        });

        // Write to response
        const excelBuffer = await wb.writeToBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
        res.send(excelBuffer);

    } catch (error) {
        console.error('Error generating Excel sales report', error);
        res.status(500).send('Error generating Excel sales report');
    }
};


exports.getCharts = async(req,res)=>{
    console.log("inside getCharts");
    const { timeframe } = req.params;
    console.log("timeframe:",timeframe);
    let groupKey, dateFormat;

    if (timeframe === 'months') {
        groupKey = { $month: '$date' };
        dateFormat = '%m';
    } else if (timeframe === 'years') {
        groupKey = { $year: '$date' };
        dateFormat = '%Y';
    } else if (timeframe === 'days') {
        groupKey = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        dateFormat = '%Y-%m-%d';
    }

    try {
        const result = await Order.aggregate([
            { $match: { orderStatus: 'delivered' } },
            {
                $group: {
                    _id: groupKey,
                    count: { $sum: { $size: '$items' } } // Count products per order
                }
            }
        ]);

        console.log("result:",result);
        // Transform result to format expected by Chart.js (labels and data)
        const labels = result.map(entry => {
            // Format date labels if needed (e.g., using Moment.js)
            return formatDate(entry._id, dateFormat); // Implement formatDate function as needed
        });
        const data = result.map(entry => entry.count);

        res.json({ labels, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }

}

function formatDate(date, format) {
    const d = new Date(date);

    if (format === '%Y') {
        return d.getFullYear().toString();
    } else if (format === '%m') {
        return (d.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JavaScript
    } else if (format === '%Y-%m-%d') {
        return d.toISOString().split('T')[0];
    }
}

exports.getCustomers=async(req,res)=>{
    try{
    const users=await User.find().exec()
    res.render('admin/customers',{users})

    }catch(err){
        console.error("error fetching customers",err);

    }
}

// exports.postUpdateCustomerStatus=(async(req,res)=>{
//     try{
//         const {userId}=req.body
//         const user=await User.findById(userId)
//         if(!user){
//             return res.status(200).send("user not found")
//         }else{
//             user.isBlocked=!user.isBlocked;
//             await user.save();
//             return res.redirect('/admin/customers')
//         }

//     }catch(err){
//         console.error("error in updating the status of the customer",err);
//         res.redirect('/admin/dashboard')
//     }
// })

exports.postUpdateCustomerStatus = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: "User not found" 
            });
        }
        
        // Toggle the blocked status
        user.isBlocked = !user.isBlocked;
        await user.save();
        
        // Return JSON response (not redirect!)
        return res.json({ 
            success: true, 
            isBlocked: user.isBlocked,
            userId: user._id
        });
        
    } catch (err) {
        console.error("Error in updating the status of the customer", err);
        return res.status(500).json({ 
            success: false, 
            error: "Server error" 
        });
    }
}
exports.getProductPage=(async(req,res)=>{
    try{
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Adjust the limit as needed
        const skip = (page - 1) * limit; 

        // Get the total number of products that match the filter
        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        let startIndex=skip+1;

        const products = await Product.find().populate('category').sort({ createdAt: -1 }).limit(limit).skip(skip).exec();
        console.log("inside product page");
        res.render("admin/products",{products,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            startIndex,
            limit
        })
    }catch(err){
        console.error('Error in getting product page',err);
    }
    
})
exports.postRemoveProduct=async(req,res)=>{
    try{
        console.log("inside admin remove product");
        const productId=req.query.productId;
        console.log("productId :",productId);
        await Product.findOneAndDelete({_id:productId})
        res.status(200).json({ message: 'Product deleted successfully' });
    }catch(err){
        console.error('Error in deleting product',err);
    }
}
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
        const categories=await Category.find()
        res.render('admin/add-products', { categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
  })

//   exports.postUpdateProductStatus=(async(req,res)=>{
//     try{
//         const {productId}=req.body
//         const product=await Product.findById(productId)
//         if(!product){
//             return res.status(200).send("product not found")
//         }else{
//             product.isBlocked=!product.isBlocked;
//             await product.save();
//             return res.redirect('/admin/products')
//         }

//     }catch(err){
//         console.error("error in updating the status of the customer",err);
//         res.redirect('/admin/dashboard')
//     }
// })


exports.postUpdateProductStatus = async (req, res) => {
    try {
        const { productId } = req.body;
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                error: "Product not found" 
            });
        }
        
        product.isBlocked = !product.isBlocked;
        await product.save();
        
        return res.json({ 
            success: true, 
            isBlocked: product.isBlocked,
            productId: product._id
        });
        
    } catch (err) {
        console.error("Error in updating the status of the product", err);
        return res.status(500).json({ 
            success: false, 
            error: "Server error" 
        });
    }
}
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
        const existingProduct = await Product.findById(productId)
        console.log("productId:", productId); 
        let images;
        console.log("req.file",req.files);
        if(req.files && req.files.length>0){
         images = req.files.map(file => '/admin/uploads/'+ file.filename); // Assuming files are saved with path
        } else if (req.file){
          images=req.file.filename
        } else{
          images= existingProduct.images;  //no files uploaded
        }
        console.log("images:",images);
        const {name,description,originalPrice,discountPercentage,quantities,sizes,colour,category}=req.body


        if (!name || !description || !originalPrice || !discountPercentage ||!colour || !quantities || !category || !sizes) {
            req.flash('error', "All fields shall be filled properly");
            return res.redirect(`/admin/edit-product/${productId}`);
        }

        const sizeQuantityArray = sizes.map(size => ({
            size,
            quantity: quantities[size] || 0 // Use the corresponding quantity for each size
        }));
        
      const updatedProduct = {
        name,
        description,
        originalPrice,
        discountPercentage,
        price:originalPrice*(1-discountPercentage/100),
        colour,
        // size: Array.isArray(sizes) ? sizes : [sizes],// Ensure size is an array
        sizes: sizeQuantityArray,
        category,
        images
      };

      console.log("updated products:",updatedProduct);
        await Product.findByIdAndUpdate(productId, updatedProduct,{ new: true });
        req.flash('success','Product editted successfully')
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.postAddProducts = async (req, res) => {
    try {
        const { name, description, originalPrice, discountPercentage, colour, quantities, category, sizes } = req.body;

        if (!name || !description || !originalPrice || !discountPercentage || !colour || !quantities || !sizes  || !category) {
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

        const sizeQuantityArray = sizes.map(size => ({
            size,
            quantity: quantities[size] || 0 // Use the corresponding quantity for each size
        }));

        console.log("category:",category);
        const categoryId = new mongoose.Types.ObjectId(category);
        console.log("categoryId:",categoryId);

        const newProduct = new Product({
            name,
            description,   
            originalPrice,
            discountPercentage,
            price:originalPrice*(1-discountPercentage/100),
            colour,
            category:categoryId,
            images,
            sizes: sizeQuantityArray
        });

        console.log("new product:", newProduct);
        // await Product.create(newProduct);
        await newProduct.save();
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
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Adjust the limit as needed
        const skip = (page - 1) * limit; 

        // Get the total number of products that match the filter
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        let startIndex=skip+1;


        let categories= await Category.find().populate('products').limit(limit).skip(skip).exec()
        // console.log("categories",categories);
        const countPromises=categories.map(async category=>{
            const productCount= await countProductsForCategory(category._id);
            return {...category.toJSON(), productCount}
        })
        const categoriesWithProductCount= await Promise.all(countPromises)
        // console.log("categoryCount:",categoriesWithProductCount);
        return res.render('admin/categories',{categories, categoriesWithProductCount,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            startIndex,
            limit })
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
        const name=req.body.name
        console.log("name", name);
        const existingCategory= await Category.findOne({name:{ $regex: new RegExp(`^${name}$`, 'i') }}).exec()
        console.log(existingCategory);
        if(existingCategory){
            req.flash("error", "Category with same name already exists!")
            return res.redirect('/admin/add-category')
        }
        // Update the product in the database using req.body
        await Category.findByIdAndUpdate(categoryId, req.body);
        // Redirect or send a response indicating success
        res.redirect("/admin/categories");
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.postUpdateCategoryStatus = async (req, res) => {
    try {
        const { categoryId } = req.body;
        const category = await Category.findById(categoryId);
        
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                error: "Category not found" 
            });
        }
        
        category.isBlocked = !category.isBlocked;
        await category.save();
        
        return res.json({ 
            success: true, 
            isBlocked: category.isBlocked,
            categoryId: category._id
        });
        
    } catch (err) {
        console.error("Error in updating the status of the category", err);
        return res.status(500).json({ 
            success: false, 
            error: "Server error" 
        });
    }
}

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

exports.getOrders=async(req,res)=>{
    try{

         
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Adjust the limit as needed
    const skip = (page - 1) * limit;
    const orders = await Order.find().sort({ createdAt: -1 }).populate('items.product').limit(limit).skip(skip).exec();
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    const startIndex = skip + 1;

            // const orders = await Order.find().sort({ createdAt: -1 }).populate('items.product').limit(limit).skip(skip).exec();
                return res.render('admin/orders',{orders,
                    currentPage: page,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                    nextPage: page + 1,
                    previousPage: page - 1,
                    lastPage: totalPages,
                    startIndex,
                    limit })
    }catch(err){
        console.error("Error in fetching categories",err);
    }
}

// exports.getEditOrder=async(req,res)=>{
//     try {
//         console.log("inside admin change stats/ edit order page");
//         const order = await Order.findById(req.params.id).populate('items.product').exec(); // Populate the product field in items
//         console.log("status:",order.orderStatus);
//         res.redirect('/admin/orders', { order });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// }

// exports.postEditOrder = async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         // Update the product in the database using req.body
//         await Order.findByIdAndUpdate(orderId, req.body);
//         // Redirect or send a response indicating success
//         res.redirect("/admin/orders");
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };

exports.postUpdateOrderStatus=(async(req,res)=>{
    try{
        console.log("inside post update order/change status");
        const {orderId, status}=req.body
        const order=await Order.findById(orderId)

        console.log("order selected:", order);

        if(!order){
            return res.status(200).send("product not found")
        }else{
            console.log("status from drop down:",status);
            order.orderStatus=status;
            await order.save();
            // if(status==='delivered'){
            //     for (const item of order.items) {
            //         await Product.findOneAndUpdate(
            //           { _id: item.product, "sizes.size": item.size },
            //           { $inc: { "sizes.$.quantity": -item.quantity } },
            //           { new: true }
            //         );
            //       }
            // }
            return res.redirect('/admin/orders')
        }

    }catch(err){
        console.error("error in updating the status of the order",err);
        res.redirect('/admin/dashboard')
    }
})


// List all coupons
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.render('admin/coupons', { coupons });
    } catch (err) {
        console.error("Error fetching coupons:", err);
        res.status(500).send("Internal Server Error");
    }
};



exports.postUpdateCouponStatus = async (req, res) => {
    try {
        const { couponId } = req.body;
        const coupon = await Coupon.findById(couponId);
        
        if (!coupon) {
            return res.status(404).json({ 
                success: false, 
                error: "Coupon not found" 
            });
        }
        
        coupon.status = !coupon.status;
        await coupon.save();
        
        return res.json({ 
            success: true, 
            status: coupon.status,
            couponId: coupon._id
        });
        
    } catch (err) {
        console.error("Error in updating the status of the coupon", err);
        return res.status(500).json({ 
            success: false, 
            error: "Server error" 
        });
    }
}


// Render form to add a new coupon
exports.getAddCoupon = (req, res) => {
    try{
        res.render('admin/add-coupon');
    }catch(err){
        console.error("error in getting add coupon page", err);
        return res.redirect('/admin/coupons')
    }
    
};

// Handle creating a new coupon
exports.postAddCoupon = async (req, res) => {
    const { couponCode, type, minimumPrice, discount, maxRedeem, expiry } = req.body;
    try {
        const existingCoupon= await Coupon.findOne({couponCode:{ $regex: new RegExp(`^${couponCode}$`, 'i') }}).exec()
        if(existingCoupon){
            req.flash("error", "Coupon with same name already exists!")
            return res.redirect('/admin/add-coupon')
        }
        const newCoupon = new Coupon({ couponCode, type, minimumPrice, discount, maxRedeem, expiry});
        await newCoupon.save();
        res.redirect('/admin/coupons');
    } catch (err) {
        console.error("Error adding coupon:", err);
        res.status(500).send("Internal Server Error");
    }
};

// Render form to edit an existing coupon
exports.getEditCoupon = async (req, res) => {
    const { id } = req.params;
    try {
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).send("Coupon not found");
        }
        res.render('admin/edit-coupon', { coupon });
    } catch (err) {
        console.error("Error fetching coupon:", err);
        res.status(500).send("Internal Server Error");
    }
};

// Handle updating an existing coupon
exports.postEditCoupon = async (req, res) => {
    const { id } = req.params;
    const { couponCode, type, minimumPrice, discount, maxRedeem, expiry, status } = req.body;
    try {
        const coupon = await Coupon.findByIdAndUpdate(id, { couponCode, type, minimumPrice, discount, maxRedeem, expiry, status }, { new: true });
        if (!coupon) {
            return res.status(404).send("Coupon not found");
        }
        res.redirect('/admin/coupons');
    } catch (err) {
        console.error("Error updating coupon:", err);
        res.status(500).send("Internal Server Error");
    }
};

exports.getLogoutPage=(req,res)=>{
    try {
        if (!req.session.isAdAuth) {
            return res.redirect('/admin/login');
        }
        req.session.isAdAuth = false;
        return res.redirect('/admin/login');
    } catch (err) {
        console.error("Error in logging out", err);
        return res.redirect('/admin/login');
    }
}

