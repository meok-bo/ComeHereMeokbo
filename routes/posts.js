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
router.get('/del',function(req,res){
	Post.remove({},function(err,output){
		res.redirect('/');
	});
});
router.get('/del/:id',function(req,res){
	Post.remove({_id:mongoose.Types.ObjectId(req.params.id)},function(err,output){
		res.redirect('/');
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
	var data={session:null};
	var _title,_cookTime,_cookAmount,_ingredient=[],_recipe=[],_taste,_diff;
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
			}
			else if(name=="cookTime"){
				_cookTime=value;
			}
			else if(name=="cookAmount"){
				_cookAmount=value;
			}
			else if(name=="taste"){
				_taste=value;
			}
			else if(name=="diff"){
				_diff=value;
			}
			else if(name=="name"){
				if(_ingredient[name_cnt]){
					_ingredient[name_cnt].name=value;
				}
				else{
					_ingredient[name_cnt]={name:value,amount:null};
				}
				name_cnt++;
			}
			else if(name=="amount"){
				if(_ingredient[amount_cnt]){
					_ingredient[amount_cnt].amount=value;
				}
				else{
					_ingredient[amount_cnt]={name:null,amount:value};
				}
				amount_cnt++;
			}
			else if(name=="comment"){
				if(_recipe[comment_cnt]){
					_recipe[comment_cnt].comment=value;
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

				if(_recipe[temp_cnt]){
					_recipe[temp_cnt].img=fileName;
				}
				else{
					_recipe[temp_cnt]={comment:null,img:fileName};
				}
                temp_cnt++;

				part.on('end',function(){
	                writeStream.end();
	           });
			}
		});

		form.on('close',function(){

			Post.findOne({title:_title},function(err,post){
				if(post && post.title==_title){
					res.send({"err":1,"msg":"중복된 요리제목입니다"});
				}
				else{
					for(i=0;i<_ingredient.length;i++){
						if(_ingredient[i].name==""){
							_ingredient.splice(i,1);
							i--;
						}
					}

					var _Post=new Post();
					_Post.title=_title;
					_Post.cookTime=_cookTime;
					_Post.cookAmount=_cookAmount;
					_Post.author=_author;
					_Post.ingredient=_ingredient;
					_Post.recipe=_recipe;
					_Post.taste=_taste;
					_Post.diff=_diff;

					_Post.save(function(err){
						if(err){
							res.send({"err":1,"msg":err})
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
								}
								post.recipe=temp_recipe;
								post.save(function(err){
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

//검색 route
router.get('/search/taste',function(req,res){
	Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$sort:{taste:-1}}],function(err,posts){
		var data={now_page:0,total_page:0,list:null,session:null,type:"taste",key:null};
		var page;
		if(req.session.email) {
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id,
				img:req.session.img
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
				data.total_page=Math.floor((posts.length/12)-1);
				data.list=posts;
			}else{
				data.now_page=page;
				data.total_page=Math.floor(posts.length/12);
				data.list=posts;
			}
		}
		//res.send(data);
		res.render('posts/list',data);
	});
});

router.get('/search/diff',function(req,res){
	Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$sort:{diff:1}}],function(err,posts){
		var data={now_page:0,total_page:0,list:null,session:null,type:"diff",key:null};
		var page;
		if(req.session.email) {
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id,
				img:req.session.img
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
				data.total_page=Math.floor((posts.length/12)-1);
				data.list=posts;
			}else{
				data.now_page=page;
				data.total_page=Math.floor(posts.length/12);
				data.list=posts;
			}
		}
		//res.send(data);
		res.render('posts/list',data);
	});
});

router.get('/search/title',function(req,res){
	if(req.query.search_opt=="author"){
		res.redirect('/posts/search/author?value='+req.query.value);
	}else if(req.query.search_opt=="ingredient"){
		res.redirect('/posts/search/ingredient?value='+req.query.value);
	}else{
		Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{title:{$regex:req.query.value}}}],function(err,posts){
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

			if(req.query.page && req.query.page*12>=posts.length) page=req.query.page;
			else page=1;

			if(posts==null){
				data.now_page=0;
				data.total_page=0;
				data.list=null;
			}else {
				if((posts.length%12)==0){
					data.now_page=page;
					data.total_page=Math.floor((posts.length/12)-1);
					data.list=posts;
				}else{
					data.now_page=page;
					data.total_page=Math.floor(posts.length/12);
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

		if(req.query.page && req.query.page*12>=posts.length) page=req.query.page;
		else page=1;

		if(posts==null){
			data.now_page=0;
			data.total_page=0;
			data.list=null;
		}else {
			if((posts.length%12)==0){
				data.now_page=page;
				data.total_page=Math.floor((posts.length/12)-1);
				data.list=posts;
			}else{
				data.now_page=page;
				data.total_page=Math.floor(posts.length/12);
				data.list=posts;
			}
		}
		//res.send(data);
		res.render('posts/list',data);
	});
	
});

router.get('/search/author/:id',function(req,res){
	Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{user:{$elemMatch:{_id:mongoose.Types.ObjectId(req.params.id)}}}}],function(err,posts){
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

		if(req.query.page && req.query.page*12>=posts.length) page=req.query.page;
		else page=1;

		if(posts==null){
			data.now_page=0;
			data.total_page=0;
			data.list=null;
		}else {
			if((posts.length%12)==0){
				data.now_page=page;
				data.total_page=Math.floor((posts.length/12)-1);
				data.list=posts;
			}else{
				data.now_page=page;
				data.total_page=Math.floor(posts.length/12);
				data.list=posts;
			}
		}
		//res.send(data);
		res.render('posts/list',data);
	});
	
});

router.get('/search/ingredient',function(req,res){
	Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{ingredient:{$elemMatch:{name:{$regex:req.query.value}}}}}],function(err,posts){
		var data={now_page:0,total_page:0,list:null,session:null,type:"ingredient",key:req.query.value};
		var page;
		if(req.session.email) {
			data.session={
				email:req.session.email,
				name:req.session.name,
				id:req.session.id,
				img:req.session.img
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
				data.total_page=Math.floor((posts.length/12)-1);
				data.list=posts;
			}else{
				data.now_page=page;
				data.total_page=Math.floor(posts.length/12);
				data.list=posts;
			}
		}
		res.render('posts/list',data);
	});
});

router.get('/edit/:id',function(req,res){
	var data={post:null,session:null};
	if(!req.session.email) res.redirect('/');
	else{

		data.session={
			email:req.session.email,
			name:req.session.name,
			id:req.session.id,
			img:req.session.img
		};

		Post.aggregate([{$lookup:{from:"users",localField:"author",foreignField:"email",as:"user"}},{$match:{_id:mongoose.Types.ObjectId(req.params.id)}}],function(err,post){
			if(post){
				if(req.session.email!=post[0].user[0].email){
					res.redirect('/');
				}
				else{
					data.post=post;
					res.render('posts/edit',data);
				}
			}else{
				res.redirect('/');
			}
		});
	}
})

router.put('/edit',function(req,res){
	var form=new multiparty.Form();
	var _title,_cookTime,_cookAmount,_ingredient=[],_recipe=[],_taste,_diff;
	var _file=[];
	var _order=[],_changed=[];
	var temp_cnt=0;
	var name_cnt=0;
	var amount_cnt=0;
	var comment_cnt=0;
	var order_cnt=0;
	var changed_cnt=0;

	if(!req.session.email) res.redirect('/');
	else{

		form.on('field',function(name,value){
			if(name=="title"){
				_title=value;
			}
			else if(name=="cookTime"){
				_cookTime=value;
			}
			else if(name=="cookAmount"){
				_cookAmount=value;
			}
			else if(name=="taste"){
				_taste=value;
			}
			else if(name=="diff"){
				_diff=value;
			}
			else if(name=="name"){
				if(_ingredient[name_cnt]){
					_ingredient[name_cnt].name=value;
				}
				else{
					_ingredient[name_cnt]={name:value,amount:null};
				}
				name_cnt++;
			}
			else if(name=="amount"){
				if(_ingredient[amount_cnt]){
					_ingredient[amount_cnt].amount=value;
				}
				else{
					_ingredient[amount_cnt]={name:null,amount:value};
				}
				amount_cnt++;
			}
			else if(name=="comment"){
				_recipe[comment_cnt]={comment:value,img:null};
				comment_cnt++;
			}
			else if(name=="order"){
				_order[order_cnt]=value;
				order_cnt++;
			}
			else if(name=="changed"){
				_changed[changed_cnt]=value;
				changed_cnt++;
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

				_file[temp_cnt]=fileName;
                temp_cnt++;

				part.on('end',function(){
	                writeStream.end();
	           });
			}
		});

		form.on('close',function(){

			Post.findOne({title:_title},function(err,post){

				for(i=0;i<_ingredient.length;i++){
					if(_ingredient[i].name==""){
						_ingredient.splice(i,1);
						i--;
					}
				}

				var temp_path='./public/imgs/user/';
				var file_cnt=0;
				for(i=0;i<_recipe.length;i++){

					if(_changed[i]=='0'){
						if(i!=Number(_order[i])){
							var temp_ext1=post.recipe[Number(_order[i])].img.split('.');
							var temp_ext2=temp_ext1[temp_ext1.length-1];
							var fileName=post._id+'_'+i+'.'+temp_ext2;

							fs.rename(post.recipe[Number(_order[i])].img,fileName);
							_recipe[i].img=fileName;
						}
						else{
							_recipe[i].img=post.recipe[i].img;
						}
					}
					else{
						var temp_ext1=_file[file_cnt].split('.');
						var temp_ext2=temp_ext1[temp_ext1.length-1];
						var fileName1=temp_path+_file[file_cnt];
						var fileName2=temp_path+post._id+'_'+i+'.'+temp_ext2;
						var fileName3=post._id+'_'+i+'.'+temp_ext2;

						fs.rename(fileName1,fileName2);
						_recipe[i].img=fileName3;
						file_cnt++;
					}
				}



				post.cookTime=_cookTime;
				post.cookAmount=_cookAmount;
				post.ingredient=_ingredient;
				post.recipe=_recipe;
				post.taste=_taste;
				post.diff=_diff;

				post.save(function(err){
					if(err){
						res.send({"err":1,"msg":err})
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

module.exports=router;