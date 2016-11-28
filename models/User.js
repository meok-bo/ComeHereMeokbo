var mongoose=require('mongoose');

var userSchema=mongoose.Schema({
	email:{type:String, required:true, unique:true},
	name:{type:String, required:true, unique:true},
	password:{type:String, required:true},
	img:{type:String}
});

// model & export
var User = mongoose.model("user",userSchema);
module.exports=User;