var mongoose=require('mongoose');

var userSchema=mongoose.Schema({
	email:{type:String, required:[true,"이메일을 입력해주세요"], unique:true},
	name:{type:String, required:[true,"이름을 입력해주세요"], unique:true},
	password:{type:String, required:[true,"비밀번호를 입력해주세요"]}
});

// model & export
var User = mongoose.model("user",userSchema);
module.exports=User;