var mongoose=require('mongoose');

var postSchema=mongoose.Schema({
	title:{type:String,required:true, unique:true},
	cookTime:{type:String,required:true},
	cookAmount:{type:String},
	ingredient:{type:mongoose.Schema.Types.Mixed},
	recipe:{type:mongoose.Schema.Types.Mixed},
	author:{type:String, ref:'user',required:true}
});

// model & export
var Post = mongoose.model("post",postSchema);
module.exports=Post;

	/*
		ingredient
		배열객체 json 사용
		[
			{
				name: "OOO",
				amount: "OOO"
			},
			{
				name: "OOO",
				amount: "OOO"
			},
			{
				name: "OOO",
				amount: "OOO"
			},
		]
	*/

	/*
		recipe
		배열객체 json 사용
		[
			{
				comment: "OOO",
				img: "OOO"
			},
			{
				comment: "OOO",
				img: "OOO"
			},
			{
				comment: "OOO",
				img: "OOO"
			},
		]
	*/