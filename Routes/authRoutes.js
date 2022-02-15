const express  = require ('express');
const authController = require('../Controllers/authControllers');
//const { requireAuth } = require("../Middleware/authMiddleware");
const app = express();
const cors = require('cors')
app.use(cors());

    
app.post('/signup',authController.signupPost);//signup route
app.post('/CheckOTP',authController.CheckOTP);//check otp route
app.post('/login',authController.loginPost);//login route 


module.exports= app;