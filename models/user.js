const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please enter your email"], // to pass an error msg in case the condition (true) is not met
      unique: true,
      lowercase: true,
      //takes a function as a first element in array then an error msg in case that function is not met or we can use third party package
      //validate:[(val)=>{},"Incorrect email"]
      validate: [validator.isEmail, "Incorrect email address"],
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
      minlength: [6, "min length of password should be 6 "],
      validate: [
        validator.isStrongPassword,
        "Your password should have 1 lowercase , 1 uppercase , 1 number , 1 symbol and size of at least 8 characters",
      ],
    },
    OTP: {
      type: String,
    },
    isAuthenticated:{
        type:Boolean, 
        default : false
    },
    URLobjects:   [{ type: mongoose.ObjectId, ref: "MonitoredURL" }],
    URLnames: [String],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  //console.log("new user is about to be saved ", this);
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

//create a static method to use for login
userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if (user) {
    //then a user with this email exist in the database
    const pass_flag = await bcrypt.compare(password, user.password);
    if (pass_flag) {
      //then the password match
      return user;
    }
    throw Error(" Incorrect password ");
  }
  throw Error(" Incorrect email ");
};
const User = mongoose.model("User", userSchema);
module.exports = User;
