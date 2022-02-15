const express = require("express");
const mongoose = require("mongoose");
const app = express();
require("dotenv").config();
const cors = require('cors');
const authRoutes = require("./Routes/authRoutes");
const monitoringRoutes=require("./Routes/monitoringRoutes");



//database
const dbUrI = process.env.dbURI;
mongoose
  .connect(dbUrI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then((result) => app.listen(4000))
  .catch((err) => console.log(err));

//view pages in ejs
app.set("view engine", "ejs");
app.use(express.json());

app.use(cors());
app.get("/", (req, res) => {res.send("home sweet home");});

//app.get('/test',(req,res)=>{res.send("Testing is successfully ")}); // for tokens


 app.use(authRoutes);
 app.use(monitoringRoutes);

