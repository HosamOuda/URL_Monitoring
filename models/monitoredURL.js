const mongoose = require('mongoose');

const MonitoredURLSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, "Please enter the url"],
        unique : true
    },
    upTimes:{
        type:Number,
        default: 0 
    },
    downTimes:{
        type:Number,
        default: 0 
    },
    lastUp:{
        type:Date,
    },
    lastDown:{
        type:Date,
    },
    status:{
        type : Boolean , 
        default : true // true mean up    false mean down
    },
    userEmails : [{ type: mongoose.ObjectId, ref: 'User' }],

},{timestamps:true});
const MonitoredURL = mongoose.model('MonitoredURL',MonitoredURLSchema);
module.exports=MonitoredURL;