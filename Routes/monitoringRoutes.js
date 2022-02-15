const express  = require ('express');
const monitoringController = require('../Controllers/monitoringController');
const { requireAuth } = require("../Middleware/authMiddleware");
const app = express();
const cors = require('cors')
app.use(cors());

    


app.post('/getUrlinfo',requireAuth,monitoringController.checkURL);//check the status of the URL 
app.put('/updateURL', requireAuth , monitoringController.updateURL);// update a certain url 
app.delete('/deleteURL',requireAuth , monitoringController.deleteURL); // delete a given url from the user db 
// app.get('/getReport',requireAuth , monitoringController.getReport); //get report about a a certain url
module.exports= app;