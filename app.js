const express = require('express');
var jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
var cookieParser = require('cookie-parser');
const path = require('path');
var bodyParser = require('body-parser');
const mongoose = require('mongoose');
const signUp = require('./models/signUp.js');
const bookList = require('./models/bookList.js');
const bookBorrow = require('./models/bookBorrow.js');
const e = require('express');
const { title, nextTick } = require('process');
const cartList = require('./models/bookCart');
const { reset } = require('nodemon');
const { getUnpackedSettings } = require('http2');
const auth = require('./middlewares/auth.js');
let alert = require('alert'); 
const { response } = require('express');
const app = express();



// console.log(books);
mongoose.connect('mongodb://localhost:27017/CradleLibrary', {
    useNewUrlParser : true});
const db = mongoose.connection;
db.on("error", ()=>{
    console.log("Error in Connection");
})
db.once('open', ()=>{
    console.log("Connected");
})


// Declaring static folders
app.use('/static', express.static(path.join(__dirname, 'static')));

// Middlewares
app.use(cookieParser())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', './views');

let cart = [];


// Routers

// Home
app.get('/', auth ,(req, res) => {
    bookList.find({},(err, data)=>{
        res.render('home',{books:data, notLoggedIn:false});
    })
});


app.post('/',auth,async(req,res)=>{
    const book_id = req.body.book_id;
    let bookData = await bookList.findOne({_id:book_id});
    let bookStock = bookData.inStock;
    if(bookStock <= 0){
        alert("No Books Left");
        bookList.find({},(err, data)=>{
            res.render('home',{books:data, notLoggedIn:false});
        })
    }else{
        const guser = req.cookies.userEmail;
        await bookList.findOneAndUpdate({_id:book_id},{inStock:bookStock-1});
        cart.push(book_id);
        cartList.findOneAndUpdate({ email: guser }, 
            { bookTitle:cart }, null, function (err, docs) {
            if (err){
                console.log(err)
            }
        });
        bookList.find({},(err, data)=>{
            res.render('home',{books:data, notLoggedIn:false});
        })
    }
});


// Register
app.get('/register', (req, res) => {
    res.render('signup', {message:""});
});


app.post('/register', async(req, res) => {
    const {
        name,
        email,
        phone,
        password,
        conpassword
    } = req.body;

    if(password === conpassword) {
        const userData = new signUp({
            name:name,
            email:email,
            phone:phone,
            password:password
        });

        const cartData = new cartList({
            email:email,
            bookTitle:[]
        })

        const borrowData = new bookBorrow({
            email:email,
            bookTitle:[]
        });


        userData.save(err=>{
            if(err) {
                res.render('signup', {message:"Email Already Exists"});
            } else {
                cartData.save();
                borrowData.save().then(()=>{
                    res.render('login', {lmessage:""});
                });
            }
        })
    } else {
        res.render('signup', {message:"Passwords do not Match"});
    }
});



// Login
app.get('/login', (req, res) => {
    res.render('login', {lmessage:""});
});

app.post('/login', async(req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const validation = signUp.findOne({email : email}, async (err, data)=>{
        if(data == null) {
            res.render('login', {lmessage:"User Not Found"});
        } else {
            const vemail = data.email;
            const vpassword = data.password;


            const token = await data.generateAuthToken();
            res.cookie("jwt", token,{
                httpOnly:true
            });
            res.cookie("userEmail", vemail,{
                httpOnly:true
            })
            let checkPassword = await bcrypt.compare(password, vpassword);
            if(checkPassword) {
                bookList.find({},(err, data)=>{
                    let userInfo = {
                        email : vemail,
                        password : vpassword
                    };
                    let userInfo_serialized = JSON.stringify(userInfo);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem("userInfo", userInfo_serialized);
                    }
                    res.render('home',{books:data, notLoggedIn:false});
                })
            } else {
                res.render('login', {lmessage:"Wrong Pasword Entered"});
            }
        }
    })
});



// Logout
app.get('/logout', auth,(req,res)=>{
    res.clearCookie("jwt");
    res.clearCookie("userEmail");
    res.render('login', {lmessage:""});
});


function doSomethingElseWith(result, cart) {
    cart.push(result);
}

app.get('/cart',auth,async function(req, res, next) {
    const guser = req.cookies.userEmail;
    let checkCart = [];
    cartList.findOne({email:guser} ,async(err,data)=>{
        for(i=0; i<data.bookTitle.length;i++){
            let result = await bookList.findOne({_id:data.bookTitle[i]});
            doSomethingElseWith(result, checkCart);
        }
        res.render('cart',{books:checkCart});
    })
})

const deleteFromCart = async (req,res,next)=>{
    const guser = req.cookies.userEmail;
    if(req.body.del_cart !== "")
    {
        const bookData = await bookList.findOne({_id:req.body.del_cart});
        let stockCurr = bookData.inStock;
        await bookList.findOneAndUpdate({_id:req.body.del_cart},{inStock:stockCurr+1});
        cartList.findOne({email:guser}, (err, data)=>{
            let arr = data.bookTitle;
            const index = arr.indexOf(req.body.del_cart);
            if(index>-1){
                arr.splice(index,1);
            }
            cartList.findOneAndUpdate({email:guser}, {bookTitle:arr} ,null,(err,data)=>{
                if(err){
                    console.log("err");
                }else{
                    console.log("Success");
                }
                next();
            })
        })
    }else{
        next();
    }
}


app.post('/cart',auth,deleteFromCart, function(req, res) {
    const guser = req.cookies.userEmail;
    let checkCart = [];
    cartList.findOne({email:guser} ,async(err,data)=>{
        for(i=0; i<data.bookTitle.length;i++){
            let result = await bookList.findOne({_id:data.bookTitle[i]});
            doSomethingElseWith(result, checkCart);
        }
        res.render('cart',{books:checkCart});
    })
})


// Dashboard
const dashboardMiddleware = async (req,res,next)=>{
    const guser = req.cookies.userEmail;
    const tempRes = await cartList.findOne({email:guser});
    const dataBook = tempRes.bookTitle;
    bookBorrow.findOne({email:guser}, (err,data)=>{
        let newData = data.bookTitle;
        for(i of dataBook){
            newData.push(i);
        };
        const newEmptyArr = [];
        bookBorrow.findOneAndUpdate({email:guser},{bookTitle:newData},null,(err,data)=>{
                if(!err){
                    cartList.findOneAndUpdate({email:guser}, {bookTitle:newEmptyArr}, null, (err , data)=>{
                        if(err){
                            console.log("Error");
                    }else{
                        next();
                    }
                });
            }
        });
    });
}

const borrowStore = (cartBorrow, curr)=>{
    cartBorrow.push(curr)
}

app.get('/dashboard', auth,dashboardMiddleware, (req,res)=>{
    const guser = req.cookies.userEmail;
    bookBorrow.findOne({email:guser}, async (err, data)=>{
        let cartBorrow = [];
        for(b of data.bookTitle){
            let curr = await bookList.findOne({_id:b});
            borrowStore(cartBorrow, curr);
        }
        res.render('dashboard', {books:cartBorrow});
    });
});



const delDashboardMiddleWare = async (req,res,next)=>{
    const guser = req.cookies.userEmail;
    const bookData = await bookList.findOne({_id:req.body.del_cart});
        // console.log(bookData);
    let stockCurr = bookData.inStock;
    await bookList.findOneAndUpdate({_id:req.body.del_cart},{inStock:stockCurr+1});
    bookBorrow.findOne({email:guser}, (err, data)=>{
        let arr = data.bookTitle;
        const index = arr.indexOf(req.body.del_cart);
        if(index>-1){
            arr.splice(index,1);
        }
        bookBorrow.findOneAndUpdate({email:guser},{bookTitle:arr},null,(err,data)=>{
            if(err){
                console.log("Error");
            }else{
                next();
            }
        })
    })
}

app.post('/dashboard', auth,delDashboardMiddleWare ,(req, res)=>{
    const guser = req.cookies.userEmail;
    bookBorrow.findOne({email:guser}, async (err, data)=>{
        let cartBorrow = [];
        for(b of data.bookTitle){
            let curr = await bookList.findOne({_id:b});
            borrowStore(cartBorrow, curr);
        }
        res.render('dashboard', {books:cartBorrow});
    });
})



app.listen(3000, ()=>{
    console.log("Running at http://localhost:"+3000);
});