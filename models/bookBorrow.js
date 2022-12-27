const mongoose = require('mongoose');

const schema = mongoose.Schema;
const bookBorrow = new schema({
    email:{
        type:String
    },
    bookTitle:{
        type:[String]
    }
});

module.exports = mongoose.model('BorrowedBook', bookBorrow);