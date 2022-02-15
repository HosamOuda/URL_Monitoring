const monitoredURL = require("../models/monitoredURL");
const User = require("../models/user");
//const { handle_errors } = require("../Common/errorHandler");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const otpGenerator = require("otp-generator");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

require("dotenv").config();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const MonitoredURL = require("../models/monitoredURL");
const OAuth2 = google.auth.OAuth2;
const handle_errors = (err) => {
  const error_obj = {};
  if (err.code === 11000) {
    error_obj["msg"] = " Duplicate email ";
    error_obj.status_code = 11000;
  }

  if (err.message == "Incorrect password") {
    error_obj["msg"] = err.message;
    error_obj.status_code = 401;
  } else if (err.message == "Incorrect email") {
    error_obj["msg"] = "Your email is not registered in the system";
    error_obj.status_code = 401;
  }

  if (err.message.includes("user validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      error_obj[properties.path] = properties.message;
      //console.log("my path " , properties.path , " the message in it " ,properties.message );
    });
    error_obj.status_code = 400;
  }
  return error_obj;
};

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
        //res.status(400).json({ msg: "Failed to create access token :(" });
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

module.exports.signupPost = async (req, res) => {
  //take the email and password through destructor
  const { email, password } = req.body;
  try {
    /* SO the verification signup process is as follows :
     1- get the email and password from the signup request
     2- generate a random one time password and save it along with the email and password in the db
     3- the user has to enter the same otp in order to proceed with checking the urls process
     */
    const OTP = otpGenerator.generate(6, {
      upperCase: false,
      specialChars: false,
      alphabets: false,
    });
    const my_user = await User.create({
      email,
      password,
      OTP,
    });

    const id = my_user._id;
    console.log("going in the sending email step");
    const template_info = { email: email, password: OTP };
    const source = fs.readFileSync(
      path.join(__dirname, "../views/OTPemail.handlebars"),
      "utf8"
    );
    const compiledTemplate = handlebars.compile(source);
    const msg_obj = {
      subject: "Bosta Assessment code verification",
      html: compiledTemplate(template_info),
      to: email,
      from: process.env.EMAIL,
    };
    // sendEmail(msg_obj ,res);
    let emailTransporter = await createTransporter();
    try {
      await emailTransporter.sendMail(msg_obj, (error, info) => {
        if (error) {
          console.log(
            "error occured while sending reset password mail please try again later ",
            error
          );
          res.status(400).json({
            msg: "error occured while sending reset password mail please try again later ",
          });
        } else {
          console.log("Huraaaaaaaaay the email has been sent");
          res.status(200).json({ msg: "Reset code has been sent" });
        }
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({ msg: error });
    }

    const token = jwt.sign({ id }, "Bost_Backend_assessment", {
      expiresIn: 3 * 24 * 60 * 60,
    });
    res.cookie("Bosta", token, {
      httpOnly: true,
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ msg: "sign up is successfull", userID: my_user._id });
  } catch (err) {
    const recieved_Err = handle_errors(err);
    console.log("error occured during signup process ", err);
    res.status(400).json({ recieved_Err });
  }
};

module.exports.CheckOTP = async (req, res) => {
  /*
    the check otp process consisits of 
    1- get otp from the user 
    2- check the jwt for the user id (to make sure that this user corresponds to that otp)
    3- upon passing the verification process --> update the isAuthenticated field in the user document to be = true 
    */
  const { OTP } = req.body;
  //decode the jwt to get the user id
  let token = req.headers.cookie;
  if (token && token.startsWith("Bosta")) {
      token = token.replace("Bosta=", "");
      jwt.verify(token, "Bost_Backend_assessment",async (err, decodeToken) => {
          if (err) res.send(401).json({msg:err});
          else
          { 
              await User.findById(decodeToken.id, async  function (err, docs) {
                  if (err) res.status(404).json({msg:err}); 
                  else {
                      let currentUser=docs;
                      const user_entry_otp = OTP;
                      const user_sent_otp = currentUser.OTP;
                      if (user_entry_otp == user_sent_otp)
                      {
                        currentUser.isAuthenticated = true; 
                        await currentUser.save();
                        res.status(200).json({ msg: "can proceed to reset password" });
                      } 
                      else res.status(400).json({ msg: "OTP not match" });
                  }
              });
          }
      })
    } 
    else {
        // the cookie is not found 
        res.send(401).json({msg:"verification cookie is not found"});
    }  
};

module.exports.loginPost = async (req, res) => {
  const { email, password } = req.body;
  try {
    const my_user = await User.login(email, password);
    const id = my_user._id;
    const token = jwt.sign({ id }, "Bost_Backend_assessment", {
      expiresIn: 3 * 24 * 60 * 60,
    });
    res.cookie("Bosta", token, {
      httpOnly: true,
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ msg: "login is successfull", userID: my_user._id });
    console.log("logged in ");
  } catch (error) {
    const recived_Err = handle_errors(error);
    res.status(400).json({ recived_Err });
  }
};
