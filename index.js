var express=require('express');
var app=express();
var bodyParser=require('body-parser');
var session=require('express-session');
var mongoose=require('mongoose');
var methodOverride=require('method-override');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

//DB연결
mongoose.connect("mongodb://sjh:1@ds147777.mlab.com:47777/mukbo");
var db=mongoose.connection;
db.once("open",function(){
	console.log("DB connected!");
});
db.on("error",function(err){
	console.log("DB error :",err);
})

//미들 웨어
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
 secret: '@#@$MYSIGN#@$#$',
 resave: false,
 saveUninitialized: true
}));
app.use(methodOverride("_method"));

//route
app.use('/',require('./routes/root'));
app.use("/users", require("./routes/users"));


//서버 open
var server=app.listen(8000,function(){
	console.log("Express server has started on port 8000");
});