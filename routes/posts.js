var express=require('express');
var router=express.Router();
var Post=require('../models/Post');
var multer=require('multer');
var multiparty=require('multiparty');
var mongoose=require('mongoose');
var fs=require('fs');
var User=require('../models/User');

router.get('/',function(req,res){
	Post.find({},function(err,posts){
		res.send(posts);
	});
});

router.get('/show',function(req,res){
	var data={session:null}
	res.render('posts/show', data);
});

router.get('/show/:id',function(req,res){
	var data={session:null,post:null};
	if(req.session.email){
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};
	}
	Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{_id:mongoose.Types.ObjectId(req.params.id)}}],function(err,post){
		if(post){
			data.post=post;
			res.render('posts/show',data);
		}else{
			res.redirect('/');
		}
	});
});

router.get('/new',function(req,res){
	var data={title:null,cookTime:null,cookAmount:null,ingredient:null,recipe:null,err_title:null,err_cookTime:null,err_recipe:null,session:null};

	if(!req.session.email) res.redirect('/');
	else{
		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};

		res.render('posts/new',data);
	}
});

router.post('/new',function(req,res){
	var form=new multiparty.Form();
	var data={title:null,cookTime:null,cookAmount:null,ingredient:null,recipe:null,err_title:null,err_cookTime:null,err_recipe:null,session:null};
	var _title,_cookTime,_cookAmount,_ingredient=[],_recipe=[];
	var temp_cnt=0;
	var name_cnt=0;
	var amount_cnt=0;
	var comment_cnt=0;

	if(!req.session.email) res.redirect('/');
	else{
		var _author=req.session.email;

		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};

		form.on('field',function(name,value){
			if(name=="title"){
				_title=value;
				data.title=_title;
			}
			else if(name=="cookTime"){
				_cookTime=value;
				data.cookTime=_cookTime;
			}
			else if(name=="cookAmount"){
				_cookAmount=value;
				data.cookAmount=_cookAmount;
			}
			else if(name=="name"){
				if(value){
					if(_ingredient[name_cnt]){
						_ingredient[name_cnt].name=value;
					}
					else{
						_ingredient[name_cnt]={name:value,amount:null};
					}
					name_cnt++;
				}
			}
			else if(name=="amount"){
				if(value){
					if(_ingredient[amount_cnt]){
						_ingredient[amount_cnt].amount=value;
					}
					else{
						_ingredient[amount_cnt]={name:null,amount:value};
					}
					amount_cnt++;
				}
			}
			else if(name="comment"){
				if(_recipe[comment_cnt]){
					_recipe[j].comment=value;
				}
				else{
					_recipe[comment_cnt]={comment:value,img:null};
				}
				comment_cnt++;
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
				var fileName=req.session.email+'_'+temp_cnt+'.'+ext2;
				
				var writeStream = fs.createWriteStream(filePath+fileName);
				writeStream.filename = fileName;
				part.pipe(writeStream);

				part.on('end',function(){
					if(_recipe[temp_cnt]){
						_recipe[temp_cnt].img=fileName;
					}
					else{
						_recipe[temp_cnt]={comment:null,img:fileName};
					}
	                temp_cnt++;
	                writeStream.end();
	           });
			}
		});

		form.on('close',function(){
			if(!_title){
				data.err_title="요리제목을 입력해주세요";
				res.render('posts/new',data);
			}
			else if(!_cookTime){
				data.err_cookTime="조리시간을 입력해주세요";
				res.render('posts/new',data);
			}
			else if(!_recipe[0]){
				data.err_recipe="레시피정보를 입력해주세요";
				res.render('posts/new',data);
			}
			else{
				Post.findOne({title:_title},function(err,post){
					if(post && post.title==_title){
						data.err_title="중복된 요리제목입니다.";
						res.render('posts/new',data);
					}
					else{
						var _Post=new Post();
						_Post.title=_title;
						_Post.cookTime=_cookTime;
						_Post.cookAmount=_cookAmount;
						_Post.author=_author;
						_Post.ingredient=_ingredient;
						_Post.recipe=_recipe;

						_Post.save(function(err){
							if(err){
								data.err_title=err;
								res.render('posts/new',data);
							}
							else{
								Post.findOne({title:_title},function(err,post){
									var temp_path='./public/imgs/user/';
									var temp_recipe=[];
									for(j=0;j<post.recipe.length;j++){
										var temp_ext1=post.recipe[j].img.split('.');
										var temp_ext2=temp_ext1[temp_ext1.length-1];
										var fileName1=temp_path+post.recipe[j].img;
										var fileName2=temp_path+post._id+'_'+j+'.'+temp_ext2;
										var fileName3=post._id+'_'+j+'.'+temp_ext2;
										fs.rename(fileName1,fileName2);
										temp_recipe[j]={comment:post.recipe[j].comment,img:fileName3};
										console.log(temp_recipe[j]);
									}
									post.recipe=temp_recipe;
									post.save(function(err){
										if(err) res.send(err);
										else res.redirect('/');
									});
								});
							}
						})
					}
				});
			}
		});

		form.parse(req);
	}


});

//검색 route

router.get('/search/title',function(req,res){
	if(req.query.search_opt=="author"){
		res.redirect('/posts/search/author?value='+req.query.value);
	}else if(req.query.search_opt=="ingredient"){
		res.redirect('/posts/search/ingredient?value='+req.query.value);
	}else{
		Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{title:{$regex:req.query.value}}}],function(err,posts){
			var data={now_page:0,total_page:0,list:null,session:null};
			var page;
			if(req.session.email) {
				data.session={
					email:req.session.email,
					name:req.session.name,
					id:req.session.id
				};
			};

			if(req.query.page && req.query.page*12>=posts.length) page=req.query.page;
			else page=1;

			if(posts==null){
				data.now_page=0;
				data.total_page=0;
				data.list=null;
			}else {
				if((posts.length%12)==0){
					data.now_page=page;
					data.total_page=posts.length/12;
					data.list=posts;
				}else{
					data.now_page=page;
					data.total_page=(posts.length/12)+1;
					data.list=posts;
				}
			}
			//res.send(data);
			res.render('posts/list',data);
		});
	}
});

router.get('/search/author',function(req,res){
	Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{user:{$elemMatch:{name:{$regex:req.query.value}}}}}],function(err,posts){
		var data={now_page:0,total_page:0,list:null,session:null};
		var page;
		if(req.session.email) {
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id
			};
		};

		if(req.query.page && req.query.page*12>=posts.length) page=req.query.page;
		else page=1;

		if(posts==null){
			data.now_page=0;
			data.total_page=0;
			data.list=null;
		}else {
			if((posts.length%12)==0){
				data.now_page=page;
				data.total_page=posts.length/12;
				data.list=posts;
			}else{
				data.now_page=page;
				data.total_page=(posts.length/12)+1;
				data.list=posts;
			}
		}
		//res.send(data);
		res.render('posts/list',data);
	});
	
});

router.get('/search/author/:id',function(req,res){
	Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{user:{$elemMatch:{name:req.params.id}}}}],function(err,posts){
		var data={now_page:0,total_page:0,list:null,session:null};
		var page;
		if(req.session.email) {
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id
			};
		};

		if(req.query.page && req.query.page*12>=posts.length) page=req.query.page;
		else page=1;

		if(posts==null){
			data.now_page=0;
			data.total_page=0;
			data.list=null;
		}else {
			if((posts.length%12)==0){
				data.now_page=page;
				data.total_page=posts.length/12;
				data.list=posts;
			}else{
				data.now_page=page;
				data.total_page=(posts.length/12)+1;
				data.list=posts;
			}
		}
		//res.send(data);
		res.render('posts/list',data);
	});
	
});

router.get('/search/ingredient',function(req,res){
	Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{ingredient:{$elemMatch:{name:{$regex:req.query.value}}}}}],function(err,posts){
		var data={now_page:0,total_page:0,list:null,session:null};
		var page;
		if(req.session.email) {
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id
			};
		};

		if(req.query.page && req.query.page*12>=posts.length) page=req.query.page;
		else page=1;

		if(posts==null){
			data.now_page=0;
			data.total_page=0;
			data.list=null;
		}else {
			if((posts.length%12)==0){
				data.now_page=page;
				data.total_page=posts.length/12;
				data.list=posts;
			}else{
				data.now_page=page;
				data.total_page=(posts.length/12)+1;
				data.list=posts;
			}
		}
		res.render('posts/list',data);
	});
});

module.exports=router;