var express=require('express');
var router=express.Router();
var User=require('../models/User');
var multiparty=require('multiparty');
var fs=require('fs');
var mongoose=require('mongoose');
var Post=require('../models/Post');
var Meeting=require('../models/Meeting');

router.get('/',function(req,res){
	User.find({},function(err,users){
		res.send(users);
	});
});

router.get('/del',function(req,res){
	User.remove({},function(err,output){
		res.redirect('/');
	});
});

router.get('/new',function(req,res){
	var data={email:null,name:null,err_pw:null,err_name:null,err_id:null,err_pw_confirm:null,err_db:null,session:null};

	if(req.session.email) res.redirect('/');

	res.render('users/new',data);
});

router.post('/new',function(req,res){
	var _email=req.body.email;
	var _name=req.body.name;
	var _pw=req.body.password;
	var _pw_confirm=req.body.password_confirm;
	var data={email:null,name:null,err_pw:null,err_name:null,err_id:null,err_pw_confirm:null,err_db:null,session:null};
	data.email=_email;
	data.name=_name;

	if(!_email){
		data.err_id="이메일을 입력해주세요";
		res.render('users/new',data);
	}
	else if(!_name){
		data.err_name="이름을 입력해주세요";
		res.render('users/new',data);
	}
	else if(!_pw){
		data.err_pw="비밀번호을 입력해주세요";
		res.render('users/new',data);
	}
	else if(!_pw_confirm){
		data.err_pw_confirm="비밀번호를 한번 더 입력해주세요";
		res.render('users/new',data);
	}
	else if(_pw!=_pw_confirm){
		data.err_pw="비밀번호가 다릅니다";
		res.render('users/new',data);
	}
	else{
		User.findOne({email:_email},function(err,user){
			if(user && user.email==_email){
				data.err_id="중복된 이메일입니다";
				res.render('users/new',data);
			}
			else{
				User.findOne({name:_name},function(err,user){
					if(user && user.name==_name){
						data.err_name="중복된 이름입니다";
						res.render('users/new',data);
					}
					else{
						var _User=new User();
						_User.email=_email;
						_User.name=_name;
						_User.password=_pw;
						_User.img=null;

						_User.save(function(err){
							if(err){
								data.err_db=err;
								res.render('users/new',data);
							}
							res.redirect('/login');
						});
					}
				});
			}
		});
	}
});

router.get('/:id',function(req,res){
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

router.get('/:id/edit',function(req,res){
	var data={err_pw:null,err_name:null,err_id:null,err_pw_confirm:null,err_db:null,session:null};
	if(!req.session.email) res.redirect('/');
	if(req.params.id!=req.session.id) res.redirect('/');
	data.session={
		email:req.session.email,
		name:req.session.name,
		id:req.session.id,
		img:req.session.img
	};
	res.render('users/edit',data);
});

router.put('/:id',function(req,res){
	var form=new multiparty.Form();
	var data={err_pw:null,err_name:null,err_id:null,err_pw_confirm:null,err_db:null,session:null};
	var _name, _pw, _pw_confirm, _img;
	var path='/users/'+req.session.id;
	if(!req.session.email) res.redirect('/');
	else if(req.params.id!=req.session.id) res.redirect('/');
	else{

		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};

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
			if(_pw && !_pw_confirm){
				data.err_pw_confirm="비밀번호를 한번 더 입력해주세요";
				res.render('users/edit',data);
			}
			else if(_pw && _pw!=_pw_confirm){
				data.err_pw="비밀번호가 다릅니다";
				res.render('users/edit',data);
			}
			else{
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
							res.redirect(path);
						});
					});
				}else{
					User.findOne({name:_name},function(err,user){
						if(user){
							data.err_name="중복된 이름입니다"
							res.render('users/edit',data);
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
									res.redirect(path);
								});
							});
							
						}
					});
				}
			}
		});

		form.parse(req);
	}
});

module.exports=router;