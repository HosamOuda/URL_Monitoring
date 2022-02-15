//this middlware is used to prevent users who didnt login from checking our content
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const requireAuth = (req, res, next) => {
    let token = req.headers.cookie;
    //if this token exist then the user has logged in so we will check this token
    if (token && token.startsWith("Bosta")) {
        token = token.replace("Bosta=", "");
        jwt.verify(token, "Bost_Backend_assessment", (err, decodeToken) => {
            if (err) {
                res.locals.user = null;
                res.status(401).json({msg:err}); 
                next();
            }
            else
            {
                User.findById(decodeToken.id, function (err, docs) {
                    if (err) {
                        res.status(400).json({msg:err}); 
                    } 
                    else {
                        //found a user with that id in the db
                        if(docs.isAuthenticated)
                        {
                            res.locals.user = docs;
                            res.status(200).json({msg:"Found the user"}); 
                            next();

                        }
                        else
                        {
                            res.status(401).json({msg:"The email is not verified"});
                            next();
                        }
                    }
                });
            }
        })
    }
    else {
        res.locals.user = null;
        res.status(401).json({msg:"Cookie doesn't exist"}); 
        next();
    }   
}
module.exports = { requireAuth };