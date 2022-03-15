const MonitoredURL = require("../models/monitoredURL");
const User = require("../models/user");
const fetch = require("node-fetch");
const { handle_errors } = require("../Common/errorHandler");

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const otpGenerator = require("otp-generator");

const fs = require("fs");
const path = require("path");

require("dotenv").config();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
let userID = "620bfc44c8edf51f4cf4ee29";
const createTransporter = async () => {
  const oauth2Client = new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  console.log("finished with the oauth2client creation");
  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        console.log(
          "the error occured while getting access token is bla bla ............. ",
          err
        );
        reject("Failed to create access token :(");
        res.status(400).json({ msg: "Failed to create access token :(" });
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL,
      accessToken,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    },
  });
  console.log("endede the transporter functions ");
  return transporter;
};



function getTokenID (req)
{
  let token = req.headers.cookie;
  if (token && token.startsWith("Bosta")) {
    token = token.replace("Bosta=", "");
    jwt.verify(token, "Bost_Backend_assessment", (err, decodeToken) => {
      if (err) res.send(401).json({ msg: err });
      else {
        console.log("the decoded token is ", decodeToken.id);
        return decodeToken.id;
      }
    });
  }
}


module.exports.checkURL = async (req, res) => {
  /*
    the check url process is : 
    1- get the url from the user 
    2- try to reach this url through a get request 
    3- if the request is made (status code of 200s ) then the success flag is set to 1 otherwise the failure flag =1
    4- the user document is populated with the results and save to the db  
    */

  const { URL } = req.body;
  let successFlag = 0;
  let failureFlag = 0;
  try {
    let res = await fetch(URL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    successFlag = 1;
  } catch (err) {
    failureFlag = 1;
  }
  console.log("the fail flag ", failureFlag, " the success flag ", successFlag);
  // const temp =  getTokenID(req);
  // console.log("THE OUTPUT OF THE FUNCTION TOKENid IS ", temp);
  let URLdocument = await MonitoredURL.findOne({ name: URL }).populate('userEmails');
  if (URLdocument) {
    // meaning that this url does exist in the monitored url database so we only need to add the current user email to its list of listening users
    const URL_prev_status = URLdocument.status;
    console.log("MY STATUS NOW IS ",URL_prev_status , ((URL_prev_status) && (failureFlag == 1)));
    if ((URL_prev_status && failureFlag == 1) || (!URL_prev_status && successFlag == 1)) {
      // change in the status
      console.log("INSIDE THE NESTED IF CONDITION");
      URLdocument.status = !URLdocument.status;
      if(failureFlag==1) URLdocument.downTimes = URLdocument.downTimes+1;
      else URLdocument.upTimes = URLdocument.upTimes+1;
      //add the average response time here 

      await URLdocument.save();
      console.log("Saved the changes in the url document ")
      //send notification to all subscribed users 
      console.log("MY EMAILS LIST ",URLdocument.userEmails.email);
      
      for(let userDoc of URLdocument.userEmails){
        let userMail = userDoc.email;
        const template_info = { email: userMail, urlName: URL };
        const source = fs.readFileSync(path.join(__dirname, "../views/URLstatusChange.handlebars"),"utf8");
        const compiledTemplate = handlebars.compile(source);
        const msg_obj = {
            subject: "Bosta URL Status change notification",
            html: compiledTemplate(template_info),
            to: userMail,
            from: process.env.EMAIL,
        };
        let emailTransporter = await createTransporter();
        try {
            await emailTransporter.sendMail(msg_obj, (error, info) => {
            if (error) {
                console.log("error occured while sending reset password mail please try again later ",error);
                res.status(400).json({msg: "error occured while sending reset password mail please try again later "});
            } else {
                console.log("Huraaaaaaaaay the email has been sent");
                res.status(200).json({ msg: "Notification mail has been sent" });
            }
            });
        } catch (error) {
            console.log(error);
            res.status(400).json({ msg: error });
        }
      }
      //finally push our user to the list of subscribed users in the url document and push the url into the user document
      let currentUser = await User.findOne({_id: userID});
      currentUser.URLnames.push(URL);
      currentUser.URLobjects.push(URLdocument);
      await currentUser.save();
      URLdocument.userEmails.push(currentUser);
      await URLdocument.save();
    }
  }
  else{
      console.log("ENTERING THE CRITICAL SECTION");
      //the document is not there so we make a new one
      const currentUser = await User.findOne({_id:userID}); 
      console.log("MY CURRENT USER IS ", currentUser);
      let Urlstatus = true; 
      if(failureFlag==1) Urlstatus=false;
      const myCreatedURLdoc = await MonitoredURL.create({name: URL , status : Urlstatus });
      myCreatedURLdoc.userEmails.push(userID);
      if(Urlstatus) myCreatedURLdoc.upTimes = 1 ;
      else myCreatedURLdoc.downTimes = 1 ; 
      await myCreatedURLdoc.save();
      console.log("DONE SAVING THE DOCUMENT YAAAAAAAYY");
      currentUser.URLnames.push(URL);
      currentUser.URLobjects.push(myCreatedURLdoc);
      await currentUser.save();
      console.log("FINISHED SAVING THE UPDATED USER DOCS");
      

      
  }
  
};

module.exports.updateURL = async (req, res) => {
    const {URL , UpdatedURL} = req.body;
    const targetedURLdoc = await MonitoredURL.findOne({name : URL});
    if(targetedURLdoc)// found this doc
    {
        targetedURLdoc.name = UpdatedURL ; 
        await targetedURLdoc.save();
        res.status(200).json({"msg" : "Update record is done successfully"});
    }
    else res.status(404).json({"msg" : "Couldn't find the record with that url"});
};

module.exports.deleteURL = async (req, res) => {
    const {URL} = req.body;
    console.log("MY URL IS ", URL);
    let currentUser = await User.findOne({_id : userID});
    console.log("FOUND THE USER ",currentUser);
    if(currentUser.URLnames.includes(URL)) // the user has this url in his subscription list 
    {
        let URLindex = currentUser.URLnames.indexOf(URL);
        currentUser.URLnames.splice(URLindex, 1);
        currentUser.URLobjects.splice(URLindex,1);
        await currentUser.save();
        // phase 2 to remove the subscriped user email from the url document 
        let URLdocument = await MonitoredURL.findOne({ name : URL}); 
        let userIndex = URLdocument.userEmails.indexOf(userID);
        URLdocument.userEmails.splice(userIndex,1);
        await URLdocument.save();
    }
    res.status(200).json({msg:"URL is deleted successfully"});
    

 };

module.exports.getReport = async (req, res) => {
    const currentUser = await User.findOne({_id:userID} , ' URLnames URLobjects email').lean()
    .populate("URLobjects" , 'name status upTimes downTimes lastUp lastDown');
    res.status(200).json({Report : currentUser});
};
