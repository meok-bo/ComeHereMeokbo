var mongoose=require('mongoose');

var repleSchema=mongoose.Schema({
	title:{type:String,required:true},
	author:{ type: String, ref: 'user' ,required:true},
	comment:{type:String,required:true},
	date:{type:String,required:true}
});

// model & export
var Reple = mongoose.model("reple",repleSchema);
module.exports=Reple;