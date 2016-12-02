var mongoose=require('mongoose');

var meetingSchema=mongoose.Schema({
	title:{type:String,required:true,unique:true},
	author:{type:String, ref:'users',required:true},
	text:{type:String},
	latlng:{type:mongoose.Schema.Types.Mixed, required:true},
	address:{type:String, required:true},
	date:{type:String,required:true},
	time:{type:String,required:true},
	img:{type:String}
});

// model & export
var Meeting = mongoose.model("meeting",meetingSchema);
module.exports=Meeting;
