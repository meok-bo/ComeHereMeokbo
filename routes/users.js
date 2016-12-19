var express=require('express');
var router=express.Router();
var User=require('../models/User');
var multiparty=require('multiparty');
var fs=require('fs');
var mongoose=require('mongoose');
var Post=require('../models/Post');
var Meeting=require('../models/Meeting');

router.get('/new',function(req,res){
	var data={session:null};

	if(req.session.email) res.redirect('/');

	res.render('users/new',data);
});

router.post('/new',function(req,res){
	var _email=req.body.email;
	var _name=req.body.name;
	var _pw=req.body.password;
	var _pw_confirm=req.body.password_confirm;

	User.findOne({email:_email},function(err,user){
		if(user && user.email==_email){
			res.send({"err":1});
		}
		else{
			User.findOne({name:_name},function(err,user){
				if(user && user.name==_name){
					res.send({"err":2});
				}
				else{
					var _User=new User();
					_User.email=_email;
					_User.name=_name;
					_User.password=_pw;
					_User.img="default.png";

					_User.save(function(err){
						res.send({"err":0});
					});
				}
			});
		}
	});
});

router.get('/show/:id',function(req,res){
	var data={session:null,post:null,meeting:null};
	if(!req.session.email) res.redirect('/');
	else{
		if(req.params.id!=req.session.id) res.redirect('/');
		else{
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id,
				img:req.session.img
			};
			Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{user:{$elemMatch:{email:req.session.email}}}}],function(err,post){
				data.post=post;
				Meeting.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{user:{$elemMatch:{email:req.session.email}}}}],function(err,meeting){
					data.meeting=meeting;
					res.render('users/show',data);
				});
			});
		}
	}
});

router.get('/edit/:id',function(req,res){
	var data={session:null};
	if(!req.session.email) res.redirect('/');
	else if(req.params.id!=req.session.id) res.redirect('/');
	else{
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};
		res.render('users/edit',data);
	}
});

router.put('/edit/:id',function(req,res){
	var form=new multiparty.Form();
	var _name, _pw, _pw_confirm, _img;
	var path='/users/'+req.session.id;
	if(!req.session.email) res.redirect('/');
	else if(req.params.id!=req.session.id) res.redirect('/');
	else{

		form.on('field',function(name,value){
			if(name=="name"){
				_name=value;
			}
			else if(name=="password"){
				_pw=value;
			}
			else if(name=="password_confirm"){
				_pw_confirm=value;
			}
		});

		form.on('part',function(part){
			if(!part.filename){
				part.resume();
			}
			else{
				var ext1=part.filename.split('.');
				var ext2=ext1[ext1.length-1];
				var filePath = './public/imgs/user/';
				var fileName=req.session.id+'.'+ext2;
				
				var writeStream = fs.createWriteStream(filePath+fileName);
				writeStream.filename = fileName;
				part.pipe(writeStream);

				part.on('end',function(){
					_img=fileName;
	                writeStream.end();
	           });
			}
		});

		form.on('close',function(){

			if(_name==req.session.name){
				User.findOne({name:req.session.name},function(err,user){
					if(_img){
						user.img=_img;
						req.session.img=_img;
					}
					if(_pw){
						user.password=_pw;
					}
					user.save(function(err){
						res.send({"err":0,"url":path});
					});
				});
			}else{
				User.findOne({name:_name},function(err,user){
					if(user){
						res.send({"err":1});
					}
					else{
						User.findOne({name:req.session.name},function(err,user){
							user.name=_name;
							req.session.name=_name;
							if(_img){
								user.img=_img;
								req.session.img=_img;
							}
							if(_pw){
								user.password=_pw;
							}
							user.save(function(err){
								res.send({"err":0,"url":path});
							});
						});
						
					}
				});
			}

		});

		form.parse(req);
	}
});

module.exports=router;