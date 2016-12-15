var mongoose=require('mongoose');

var ripleSchema=mongoose.Schema({
	post:{type:String,required:true},
	author:{type:String, ref:'user',required:true},
	content:{type:String,required:true}
});

// model & export
var Reple = mongoose.model("reple",repleSchema);
module.exports=Reple;