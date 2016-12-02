var express=require('express');
var router=express.Router();
var Meeting=require('../models/Meeting');
var mongoose=require('mongoose');
var User=require('../models/User');

router.get('/all',function(req,res){
	Meeting.find({},function(err,meetings){
		res.send(meetings);
	});
})

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
		Meeting.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}}],function(err,meetings){
			data.location=meetings;
			res.render('meetings/show',data);
		});
	}
});

router.get('/new',function(req,res){
	var data={session:null,date:null,time:null};
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

		res.render('meetings/new',data);
	}
});

router.post('/new',function(req,res){
	data={session:null,latlng:null};

	if(!req.session.email) res.redirect('/login');
	else{
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};
		var _Meeting=new Meeting();
		_Meeting.title=req.body.title;
		_Meeting.author=req.session.email;
		_Meeting.text=req.body.text;
		_Meeting.latlng=req.body.latlng;
		_Meeting.address=req.body.address;
		_Meeting.date=req.body.date;
		_Meeting.time=req.body.time;
		_Meeting.join=null;
		_Meeting.save(function(err){
			if(err){
				res.send(err);
			}
			else{
				res.redirect('/meetings')
			}
		})
	}
});

module.exports=router;