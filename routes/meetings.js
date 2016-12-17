var express=require('express');
var router=express.Router();
var Meeting=require('../models/Meeting');
var mongoose=require('mongoose');
var User=require('../models/User');
var multiparty=require('multiparty');
var fs=require('fs');
var Reple=require('../models/Reple');

router.get('/all',function(req,res){
	Meeting.find({},function(err,meetings){
		res.send(meetings);
	});
})
router.get('/del',function(req,res){
	Meeting.remove({},function(err,output){
		res.redirect('/');
	});
});

router.get('/del/:id',function(req,res){
	Meeting.remove({_id:mongoose.Types.ObjectId(req.params.id)},function(err,output){
		res.redirect('/');
	});
});

router.delete('/del/:id',function(req,res){
	if(!req.session.email){
		res.send({"err":1});
	}
	else{
		Meeting.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{_id:mongoose.Types.ObjectId(req.params.id)}}],function(err,meeting){
			if(req.session.email!=meeting[0].user[0].email){
				res.send({"err":1});
			}
			else{
				var fileName=meeting[0].img;
				fs.exists('./public/imgs/user/'+fileName,function(exist){
					if(exist){
						fs.unlink('./public/imgs/user/'+fileName);
					}
				});
				Reple.remove({title:meeting[0].title},function(err){
					Meeting.remove({_id:mongoose.Types.ObjectId(req.params.id)},function(err,output){
						res.send({"err":0});
					});
				});
			}
		});
	}
});



router.get('/',function(req,res){
	data={session:null,location:null};
	if(!req.session.email) res.redirect('/login');
	else{
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};
		res.redirect('/meetings/search/title?value=')
	}
});

router.get('/new',function(req,res){
	var data={session:null,date:null,time:null,err_title:null,err_address:null,err_img:null};
	var now_date=new Date();

	if(!req.session.email) res.redirect('/login');
	else{
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};

		data.date=now_date.getFullYear()+"-";
		if(now_date.getMonth()<10) data.date+="0";
		data.date+=(Number(now_date.getMonth())+1)+"-";
		if(now_date.getDate()<10) data.date+="0";
		data.date+=now_date.getDate();

		data.time="";
		if(now_date.getHours()<10) data.time+="0";
		data.time+=now_date.getHours()+":";
		if(now_date.getMinutes()<10) data.time+="0";
		data.time+=now_date.getMinutes()+":00";

		res.render('meetings/new',data);
	}
});

router.post('/new',function(req,res){
	var form=new multiparty.Form();
	var data={session:null,date:null,time:null,err_title:null,err_address:null,err_img:null};
	var _title,_author,_text,_latlng,_address,_date,_time,_img;
	var now_date=new Date();

	if(!req.session.email) res.redirect('/login');
	else{
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};
		data.date=now_date.getFullYear()+"-";
		if(now_date.getMonth()<10) data.date+="0";
		data.date+=now_date.getMonth()+"-";
		if(now_date.getDate()<10) data.date+="0";
		data.date+=now_date.getDate();

		data.time="";
		if(now_date.getHours()<10) data.time+="0";
		data.time+=now_date.getHours()+":";
		if(now_date.getMinutes()<10) data.time+="0";
		data.time+=now_date.getMinutes()+":00";
		form.on('field',function(name,value){
			if(name=="title") _title=value;
			else if(name=="author") _author=value;
			else if(name=="text") _text=value;
			else if(name=="latlng") _latlng=value;
			else if(name=="address") _address=value;
			else if(name=="date") _date=value;
			else if(name=="time") _time=value;
		});

		form.on('part',function(part){
			if(!part.filename){
				part.resume();
			}
			else{
				var ext1=part.filename.split('.');
				var ext2=ext1[ext1.length-1];
				var filePath = './public/imgs/user/';
				var fileName=req.session.email+'.'+ext2;
				
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

			Meeting.findOne({title:_title},function(err,meeting){
				if(meeting && meeting.title==_title){
					res.send({"err":1,"msg":"중복된 모임제목입니다"});
				}
				else{
					var _Meeting=new Meeting();
					_Meeting.title=_title;
					_Meeting.author=req.session.email;
					_Meeting.text=_text;
					_Meeting.latlng=_latlng;
					_Meeting.address=_address;
					_Meeting.date=_date;
					_Meeting.time=_time;
					_Meeting.img=_img

					_Meeting.save(function(err){
						if(err){
							res.send({"err":1,"msg":err});
						}
						else{
							Meeting.findOne({title:_title},function(err,meeting){
								var temp_path='./public/imgs/user/';
								var temp_ext1=meeting.img.split('.');
								var temp_ext2=temp_ext1[temp_ext1.length-1];
								var fileName1=temp_path+meeting.img;
								var fileName2=temp_path+meeting._id+'.'+temp_ext2;
								var fileName3=meeting._id+'.'+temp_ext2;
								fs.rename(fileName1,fileName2);
								meeting.img=fileName3;
								meeting.save(function(err){
									if(err) res.send({"err":1,"msg":err});
									else res.send({"err":0});
								});
							});
						}
					})
				}
			});

		});

		form.parse(req);
	}

});

router.get('/show/:id',function(req,res){
	data={session:null,meeting:null,reple:null};
	if(!req.session.email) res.redirect('/login');
	else{
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};
		Meeting.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{_id:mongoose.Types.ObjectId(req.params.id)}}],function(err,meeting){
			data.meeting=meeting;
			Reple.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{title:meeting[0].title}}],function(err,reple){
				data.reple=reple;
				res.render('meetings/show',data);
			});
		});
	}
});

router.get('/edit/:id',function(req,res){
	data={session:null,meeting:null};
	if(!req.session.email) res.redirect('/login');
	else{
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};
		Meeting.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{_id:mongoose.Types.ObjectId(req.params.id)}}],function(err,meeting){
			if(meeting){
				if(req.session.email!=meeting[0].user[0].email){
					res.redirect('/');
				}
				else{
					data.meeting=meeting;
					res.render('meetings/edit',data);
				}
			}
			else{
				res.redirect('/');
			}
		});
	}
});

router.put('/edit',function(req,res){
	var form=new multiparty.Form();
	var _title,_author,_text,_latlng,_address,_date,_time,_img;
	var now_date=new Date();

	if(!req.session.email) res.redirect('/login');
	else{

		form.on('field',function(name,value){
			if(name=="title") _title=value;
			else if(name=="author") _author=value;
			else if(name=="text") _text=value;
			else if(name=="latlng") _latlng=value;
			else if(name=="address") _address=value;
			else if(name=="date") _date=value;
			else if(name=="time") _time=value;
		});

		form.on('part',function(part){
			if(!part.filename){
				part.resume();
			}
			else{
				var ext1=part.filename.split('.');
				var ext2=ext1[ext1.length-1];
				var filePath = './public/imgs/user/';
				var fileName=req.session.email+'.'+ext2;
				
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

			Meeting.findOne({title:_title},function(err,meeting){

					meeting.text=_text;
					meeting.latlng=_latlng;
					meeting.address=_address;
					meeting.date=_date;
					meeting.time=_time;
					
					if(_img){
						var temp_path='./public/imgs/user/';
						var temp_ext1=_img.split('.');
						var temp_ext2=temp_ext1[temp_ext1.length-1];
						var fileName1=temp_path+_img;
						var fileName2=temp_path+meeting._id+'.'+temp_ext2;
						var fileName3=meeting._id+'.'+temp_ext2;
						fs.rename(fileName1,fileName2);
						meeting.img=fileName3;
					}
					

					meeting.save(function(err){
						if(err){
							res.send({"err":1,"msg":err});
						}
						else{
							res.send({"err":0});
						}
					})

			});

		});

		form.parse(req);
	}
});

router.get('/search/title',function(req,res){
	if(req.query.search_opt=="author"){
		res.redirect('/meetings/search/author?value='+req.query.value);
	}else if(req.query.search_opt=="address"){
		res.redirect('/meetings/search/address?value='+req.query.value);
	}else{
		var condition;
		if(req.query.value==""){
			condition=[{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}}];
		}else{
			condition=[{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{title:{$regex:req.query.value}}}];
		}
		Meeting.aggregate(condition,function(err,meetings){
			var data={now_page:0,total_page:0,list:null,session:null,type:"title",key:req.query.value};
			var page;
			if(req.session.email) {
				data.session={
					email:req.session.email,
					name:req.session.name,
					id:req.session.id,
					img:req.session.img
				};
			};

			if(req.query.page && req.query.page*12>=meetings.length) page=req.query.page;
			else page=1;

			if(meetings==null){
				data.now_page=0;
				data.total_page=0;
				data.list=null;
			}else {
				if((meetings.length%12)==0){
					data.now_page=page;
					data.total_page=Math.floor((meetings.length/12)-1);
					data.list=meetings;
				}else{
					data.now_page=page;
					data.total_page=Math.floor(meetings.length/12);
					data.list=meetings;
				}
			}
			data.location=meetings;
			res.render('meetings/main',data);
		});
	}
});

router.get('/search/author',function(req,res){
	var condition;
	if(req.query.value==""){
		condition=[{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}}];
	}else{
		condition=[{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{user:{$elemMatch:{name:{$regex:req.query.value}}}}}];
	}
	Meeting.aggregate(condition,function(err,meetings){
		var data={now_page:0,total_page:0,list:null,session:null,type:"author",key:req.query.value};
		var page;
		if(req.session.email) {
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id,
				img:req.session.img
			};
		};

		if(req.query.page && req.query.page*12>=meetings.length) page=req.query.page;
		else page=1;

		if(meetings==null){
			data.now_page=0;
			data.total_page=0;
			data.list=null;
		}else {
			if((meetings.length%12)==0){
				data.now_page=page;
				data.total_page=Math.floor((meetings.length/12)-1);
				data.list=meetings;
			}else{
				data.now_page=page;
				data.total_page=Math.floor(meetings.length/12);
				data.list=meetings;
			}
		}
		data.location=meetings;
		res.render('meetings/main',data);
	});

});

router.get('/search/author/:id',function(req,res){
	Meeting.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{user:{$elemMatch:{_id:mongoose.Types.ObjectId(req.params.id)}}}}],function(err,meetings){
		var data={now_page:0,total_page:0,list:null,session:null,type:"author",key:req.query.value};
		var page;
		if(req.session.email) {
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id,
				img:req.session.img
			};
		};

		if(req.query.page && req.query.page*12>=meetings.length) page=req.query.page;
		else page=1;

		if(meetings==null){
			data.now_page=0;
			data.total_page=0;
			data.list=null;
		}else {
			if((meetings.length%12)==0){
				data.now_page=page;
				data.total_page=Math.floor((meetings.length/12)-1);
				data.list=meetings;
			}else{
				data.now_page=page;
				data.total_page=Math.floor(meetings.length/12);
				data.list=meetings;
			}
		}
		data.location=meetings;
		res.render('meetings/main',data);
	});

});

router.get('/search/address',function(req,res){
	var condition;
	if(req.query.value==""){
		condition=[{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}}];
	}else{
		condition=[{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{address:{$regex:req.query.value}}}];
	}
	Meeting.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{address:{$regex:req.query.value}}}],function(err,meetings){
		var data={now_page:0,total_page:0,list:null,session:null,type:"address",key:req.query.value};
		var page;
		if(req.session.email) {
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id,
				img:req.session.img
			};
		};

		if(req.query.page && req.query.page*12>=meetings.length) page=req.query.page;
		else page=1;

		if(meetings==null){
			data.now_page=0;
			data.total_page=0;
			data.list=null;
		}else {
			if((meetings.length%12)==0){
				data.now_page=page;
				data.total_page=Math.floor((meetings.length/12)-1);
				data.list=meetings;
			}else{
				data.now_page=page;
				data.total_page=Math.floor(meetings.length/12);
				data.list=meetings;
			}
		}
		data.location=meetings;
		res.render('meetings/main',data);
	});
});

module.exports=router;