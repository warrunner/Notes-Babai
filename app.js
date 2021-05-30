const express = require("express");
const crypto = require("crypto");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
// const localStrategy = require('passport-local')
const passportLocalMongoose = require('passport-local-mongoose');


const app = express();
// app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}))
app.set("view engine", "ejs");
app.use(express.static("public"));


app.use(session({
    secret: 'yourwish',
    resave: false,
    saveUninitialized: false,
    cookie: {  }
}))

app.use(passport.initialize());
app.use(passport.session());


const mongoURI = "<mongodbserveraddress>";

// connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connect("<mongodbserveraddress>", {useNewUrlParser:true, useUnifiedTopology:true});
mongoose.set("useCreateIndex", true)

const notesSchema = new mongoose.Schema({
    department: String,
    subjectCode: String,
    fileName: [String]
});


const Note = mongoose.model("Note", notesSchema);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);



const secret = "thisismysecret";
// userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());
// passport.use(new localStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// const note = new Note({
//     department: "EE", 
//     subjectCode: "EE321",
//     fileName: ["hello"]
// });
// note.save();

let gfs;
conn.once("open", () => {
  // init stream
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads",
    useUnifiedTopology:true
  });
});



const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          console.log(req.body.departmentpicker);
          let today = new Date().toISOString().slice(0, 10)


         const filename = req.body.departmentpicker+req.body.subjectpicker+today;
          const fileInfo = {
            filename: filename,
            bucketName: "uploads"
          };
          resolve(fileInfo);
        });
      });
    }
  });
  
const upload = multer({
storage
});

app.get("/", function(req, res){
    res.render("home");
})

app.get("/login", function(req, res){
    res.render("login");
})

app.get("/register", function(req, res){
    res.render("register");
})

app.get("/index", function(req,res){
    if (req.isAuthenticated()){
        console.log("rendering")
        res.render("index");
    } else {
        console.log("problem")
        res.redirect("/login");
    }
})

app.get("/add", (req, res) => {
    if (req.isAuthenticated()){
        console.log("rendering")
        res.render("add");
    } else {
        console.log("problem")
        res.redirect("/login");
    }
})

app.get("/search", (req, res) => {
    if (req.isAuthenticated()){
        console.log("rendering")
        res.render("index");
    } else {
        console.log("problem")
        res.redirect("/login");
    }
})

app.get("/success", (req, res) => {
    if (req.isAuthenticated()){
        console.log("rendering")
        res.render("success");
    } else {
        console.log("problem")
        res.redirect("/login");
    }
})

app.get("/about", (req, res) => {
    res.render("about");
})

app.get("/contact", (req, res) => {
    res.render("contact");
})

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
})


app.post("/search", (req, res) => {
    if (req.isAuthenticated()){
        console.log(req.body);
        var optedDepartment = req.body.departmentselector;
        var optedSubject = req.body.subjectselector;
        var files;
        Note.findOne({department:optedDepartment, subjectCode:optedSubject}, function(err, foundList){
            console.log(foundList.fileName);
            files = foundList.fileName;
            res.render("search", {filename: foundList.fileName});
            if(err){
                console.log(err);
            }
        })
    } else{
        console.log("problem in search page");
        res.redirect("/login");
    }
})

app.get("/:filename", (req, res) => {
    // console.log('id', req.params.id)
    const file = gfs
      .find({
        filename: req.params.filename
      })
      .toArray((err, files) => {
        if (!files || files.length === 0) {
          return res.status(404).json({
            err: "no files exist"
          });
        }
        gfs.openDownloadStreamByName(req.params.filename).pipe(res);
      });
});



app.post("/register", function(req, res){
    User.register({username:req.body.username}, req.body.password, function(err, user){
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/index");
            })
        }
    })
});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if (err) {
            console.log(err);
            res.render("register")
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/index");
            })
        }
    })
})


app.post("/add", upload.any("file"), (req, res) => {
    if (req.isAuthenticated()){
        console.log(req.body)
        var selectedDepartment = req.body.departmentpicker;
        var selectedSubject = req.body.subjectpicker;
        
        Note.findOne({department:selectedDepartment, subjectCode: selectedSubject}, function(err, foundList){
            let today = new Date().toISOString().slice(0, 10)


            foundList.fileName.push(selectedDepartment+selectedSubject+today);
            foundList.save();
            console.log("saved succesfully");

            if(err){
                console.log(err);
            }
        })
        res.redirect("/success");
    } else {
        console.log("problem in add page");
        res.redirect("/login");
    }
  });




let port = process.env.PORT;
if(port == null || port == "") {
    port = 3000;
}


app.listen(port, () => {
  console.log("server started on " + port);
});

