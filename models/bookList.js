const mongoose = require('mongoose');

const schema = mongoose.Schema;
const bookList = new schema({
    title:{
        type:String
    },
    author:{
        type:String
    },
    country:{
        type:String
    },
    imageLink:{
        type:String
    },
    language:{
        type:String
    },
    link:{
        type:String
    },
    pages:{
        type:Number
    },
    year:{
        type:Number
    },
    inStock:{
        type:Number
    }
});

module.exports = mongoose.model("List_of_Books", bookList);