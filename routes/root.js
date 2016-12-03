var express=require('express');
var router=express.Router();
var User=require('../models/User');
var Post=require('../models/Post');

router.get('/',function(req,res){
	var data={session:null,taste:null,diff:null};
	if(req.session.email) {
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};
	};
	Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$sort:{taste:-1}}],function(err,posts){
		data.taste=posts;
		Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$sort:{diff:1}}],function(err,posts){
			data.diff=posts;
			res.render('index',data);
		});
	});
});

router.get('/login',function(req,res){
	var data={email:null,name:null,err:null,session:null};
	if(req.session.email) res.redirect('/');
	res.render('login',data);
})

router.post('/login',function(req,res){
	var _email=req.body.email;
	var _pw=req.body.password;
	var data={email:null,name:null,err:null,session:null};

	if(!_email){
		data.email=_email;
		data.err="이메일을 입력해주세요";
		res.render('login',data);
	}
	else if(!_pw){
		data.email=_email;
		data.err="비밀번호를 입력해주세요";
		res.render('login',data);
	}
	else{
		User.findOne({email:_email},function(err,user){
			if(!user){
				data.err="아이디를 확인해주세요";
				res.render('login',data);
			}
			else if(user.password!=_pw){
				data.email=_email;
				data.err="비밀번호를 확인해주세요";
				res.render('login',data);
			}else{
				req.session.email=user.email;
				req.session.name=user.name;
				req.session.id=user._id;
				req.session.img=user.img;
				res.redirect('/');
			}
		});
	}
});

router.get('/logout',function(req,res){
	req.session.destroy();
	res.redirect('/login');
});

module.exports=router;