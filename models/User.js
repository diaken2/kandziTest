const {model,Schema}=require('mongoose')
const schema=new Schema({
    email:{
        type:String
    },
    password:{
        type:String
    },
    cards:{
        type:Array
    }
})
module.exports=model("User",schema)