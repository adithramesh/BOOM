const express=require('express')
const router=express.Router()
const adminControllers=require('../controllers/adminController')
const protectRoute=require('../middlewares/adminAuth')
const path=require('path');
router.use('/uploads', express.static(path.join(__dirname,'uploads')));


router.get("/login",adminControllers.getLoginPage)

router.post('/login',adminControllers.postLoginPage)

router.get("/dashboard",adminControllers.getDashboardPage)

router.get('/customers',protectRoute.isAuth,adminControllers.getCustomers)

router.post('/update-customer-status',protectRoute.isAuth,adminControllers.postUpdateCustomerStatus)

router.get('/products',protectRoute.isAuth,adminControllers.getProductPage)

router.delete('/remove-product',protectRoute.isAuth,adminControllers.postRemoveProduct)

router.get('/edit-product/:id',protectRoute.isAuth,adminControllers.getEditProduct)

router.post('/edit-product/:id',protectRoute.isAuth,adminControllers.upload.any(),adminControllers.postEditProduct)

router.post('/update-product-status',protectRoute.isAuth,adminControllers.postUpdateProductStatus)

router.get('/add-products',protectRoute.isAuth,protectRoute.isAuth,adminControllers.getAddProducts)

router.post('/add-products',protectRoute.isAuth,adminControllers.upload.any(),adminControllers.postAddProducts)

router.get('/categories',protectRoute.isAuth,adminControllers.getCategories)

router.post('/update-category-status',protectRoute.isAuth,adminControllers.postUpdateCategoryStatus)

router.get('/edit-category/:id',protectRoute.isAuth,adminControllers.getEditCategory)

router.post('/edit-category/:id',protectRoute.isAuth,adminControllers.postEditCategory)

router.get('/add-category',protectRoute.isAuth,adminControllers.getAddCategories)

router.post('/add-category',adminControllers.postAddCategories)

router.get('/orders',protectRoute.isAuth,adminControllers.getOrders)

router.post('/update-order-status',protectRoute.isAuth,adminControllers.postUpdateOrderStatus)

// router.get('/edit-order/:id',protectRoute.isAuth,adminControllers.getEditOrder)

// router.post('/edit-order/:id',protectRoute.isAuth,adminControllers.postEditOrder)

router.get('/logout',protectRoute.isAuth,adminControllers.getLogoutPage)

module.exports=router;