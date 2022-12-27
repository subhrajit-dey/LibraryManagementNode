var cookieParser = require('cookie-parser');
var jwt = require('jsonwebtoken');
const signUp = require('../models/signUp.js');


const auth = async(req, res, next)=>{
    try{
        // console.log(req.cookies.jwt);
        let token = req.cookies.jwt;
        const verifyUser = await jwt.verify(token, "thisismysecretkeymynameissubhrajitdeyrememberit");
        let userDetails = await signUp.findOne({_id:verifyUser._id});
        req.userDetails = userDetails;
        next();
    }catch(err){
        console.log(err);
        res.render("login" , {lmessage:""});
    }
}

module.exports = auth;