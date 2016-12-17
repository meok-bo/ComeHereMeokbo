var express=require('express');
var router=express.Router();
var User=require('../models/User');
var Post=require('../models/Post');
var Reple=require('../models/Reple');

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
	var data={session:null};


	User.findOne({email:_email},function(err,user){
		if(!user){
			res.send({"err":1,"msg":"아이디를 확인해주세요"});
		}
		else if(user.password!=_pw){
			res.send({"err":2,"msg":"비밀번호를 확인해주세요"});
		}else{
			req.session.email=user.email;
			req.session.name=user.name;
			req.session.id=user._id;
			req.session.img=user.img;
			res.send({"err":0});
		}
	});

});

router.get('/logout',function(req,res){
	req.session.destroy();
	res.redirect('/login');
});

router.post('/reple/new',function(req,res){
	var _title=req.body.title;
	var _email=req.body.email;
	var _comment=req.body.comment;
	var _date;
	var now_date=new Date();

	_date=now_date.getFullYear()+"-";
	if(now_date.getMonth()<9) _date+="0";
	_date+=(Number(now_date.getMonth())+1)+"-";
	if(now_date.getDate()<10) _date+="0";
	_date+=now_date.getDate();

	var _Reple=new Reple();
	_Reple.title=_title;
	_Reple.comment=_comment;
	_Reple.author=_email;
	_Reple.date=_date;

	_Reple.save(function(err){
		res.send({"err":0,"date":_date,"comment":_comment});
	});
});

router.get('/reple',function(req,res){
	Reple.find({},function(err,reple){
		res.send(reple);
	})
})

router.get('/reple/del',function(req,res){
	Reple.remove({},function(err){
		res.redirect('/');
	});
})

module.exports=router;