const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
const db = mongoose.connection;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "keep it easy and cool",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const dbLink =
  "mongodb+srv://suman-admin:Suman@1996@pickbazar.hjbzp.mongodb.net/";

mongoose.connect(`${dbLink}pickDB`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  Password: String,
});

const userProfileSchema = new mongoose.Schema({
  name: String,
  about: String,
  userImg: {
    data: Buffer,
    contentType: String,
  },
  date: Date,
  user: userSchema,
});

const typeOfPicSchema = new mongoose.Schema({
  type: String,
  des: String,
});
const Tpo = mongoose.model("Tpo", typeOfPicSchema);
const postSchema = new mongoose.Schema({
  name: String,
  desc: String,
  img: {
    data: Buffer,
    contentType: String,
  },
  date: Date,
  schematype: typeOfPicSchema,
  creatUser: userSchema,
});
const Pic = mongoose.model("Pic", postSchema);

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
const Userprofile = mongoose.model("Userprofile", userProfileSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected!!!!!!!!");
});

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

const upload = multer({ storage: storage });

//home page route
app.get("/", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  Pic.find({}, (err, items) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred", err);
    } else {
      res.render("home", { items: items, isAuth: isAuth });
    }
  });
});

//after login
app.get("/editpost/", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  if (req.isAuthenticated()) {
    res.render("editPpost", { isAuth: isAuth });
  } else {
    res.redirect("/");
  }
});

app.get("/posts/", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  if (req.isAuthenticated()) {
    res.render("posts", { isAuth: isAuth });
  } else {
    res.redirect("/");
  }
});

app.get("/allposts/:userId", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  if (req.isAuthenticated()) {
    let items = [];
    let id = req.params.userId;
    Pic.find({}, (err, allPost) => {
      for (let post of allPost) {
        if (
          post.creatUser &&
          String(req.user._id) === String(post.creatUser._id)
        ) {
          console.log(!post.creatUser);
          items.push(post);
        }
      }
      res.render("home", { items: items, isAuth: isAuth });
    });
  } else {
    res.redirect("/");
  }
});

//genarating posts POST request
app.post("/posts/", upload.single("image"), (req, res, next) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  let obj = {
    name: req.body.name,
    desc: req.body.pesc,
    img: {
      data: fs.readFileSync(
        path.join(__dirname + "/uploads/" + req.file.filename)
      ),
      contentType: "image/png",
    },
    creatUser: req.user,
  };
  Pic.create(obj, (err, item) => {
    if (err) {
      console.log(err);
    } else {
      res.render("error", {
        message: "post create successfully!!",
        isAuth: isAuth,
        success: true,
      });
    }
  });
});

app.get("/posts/:postId", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  let id = req.params.postId;
  Pic.findById(id, (err, item) => {
    if (!err) {
      res.render("viewposts", { item: item, isAuth: isAuth });
    } else {
      res.redirect("/");
    }
  });
});

app.get("/posts/edit/:postId", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  if (req.isAuthenticated()) {
    Pic.findById(req.params.postId, (err, item) => {
      if (err) {
        res.redirect("/");
      } else if (
        item.creatUser &&
        String(req.user._id) === String(item.creatUser._id)
      ) {
        res.render("editPost", { item: item, isAuth: isAuth });
      } else {
        res.redirect("/");
      }
    });
  } else {
    res.redirect("/");
  }
});

app.post("/posts/update/:postId", upload.single("image"), (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  if (!req.isAuthenticated()) {
    res.redirect("/");
  }
  let id = req.params.postId;
  Pic.findById(id, (err, post) => {
    if (post.creatUser && String(post.creatUser._id) === String(req.user._id)) {
      Pic.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            name: req.body.name,
            desc: req.body.pesc,
            img: {
              data: fs.readFileSync(
                path.join(__dirname + "/uploads/" + req.file.filename)
              ),
              contentType: "image/png",
            },
            creatUser: req.user,
          },
        },
        { new: true },
        (err, item) => {}
      );
      res.render("error", {
        message: "post update successfully!!",
        isAuth: isAuth,
        success: true,
      });
    }
  });
});

app.get("/posts/delete/:postId", function (req, res) {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  if (!req.isAuthenticated()) {
    res.render("error", {
      message: "user not login!!",
      isAuth: isAuth,
      success: false,
    });
  }
  let id = req.params.postId;
  Pic.findById(id, (err, post) => {
    if (post.creatUser && String(post.creatUser._id) === String(req.user._id)) {
      Pic.deleteOne({ _id: id }, (err) => {
        res.render("error", {
          message: "post deleted successfully!!",
          isAuth: isAuth,
          success: true,
        });
      });
    } else {
      res.render("error", {
        message: "oops some  error!!",
        isAuth: isAuth,
        success: false,
      });
    }
  });
});
//profile related
app.get("/profile", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  if (req.isAuthenticated()) {
    let cruser = req.user;
    Userprofile.find({}, (err, allUser) => {
      for (let userr of allUser) {
        if (String(cruser._id) === String(userr.user._id)) {
          res.render("viewProfile", { user: userr, isAuth: isAuth });
        }
      }
    });
  } else {
    res.render("error", {
      message: "not loged In!!",
      isAuth: isAuth,
      success: false,
    });
  }
});

app.get("/profile/edit/:id", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  if (req.isAuthenticated) {
    console.log(String(req.params.id), String(req.user._id));
    if (String(req.params.id) === String(req.user._id)) {
      console.log("match");
      Userprofile.deleteOne({ _id: req.params.id }, (err) => {
        User.deleteOne({ _id: req.params.id }, (err) => {
          res.render("error", {
            message: "profile edited successfully!!",
            isAuth: isAuth,
            success: true,
          });
        });
      });
    } else {
      res.render("error", {
        message: "oops some error!!",
        isAuth: isAuth,
        success: false,
      });
    }
  } else {
    res.render("error", {
      message: "user not  loged in!!",
      isAuth: isAuth,
      success: false,
    });
  }
});

//registration
app.get("/registration", (req, res) => {
  res.render("registration", {});
});

app.post("/registration", upload.single("image"), (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  let Name = req.body.name;
  let Des = req.body.description;
  let Img = req.file.filename;

  User.register(
    { username: req.body.username },
    req.body.password,
    (err, user) => {
      if (err) {
        res.redirect("/registration");
      } else {
        passport.authenticate("local")(req, res, () => {
          let newUserProfile = {
            name: Name,
            about: Des,
            userImg: {
              data: fs.readFileSync(path.join(__dirname + "/uploads/" + Img)),
              contentType: "image/png",
            },
            date: Date.now(),
            user: user,
          };
          Userprofile.create(newUserProfile, (err, item) => {
            if (err) {
              res.render("error", {
                message: "oops error!!",
                isAuth: isAuth,
                success: false,
              });
            } else {
              res.render("error", {
                message: "account create successfully!!",
                isAuth: isAuth,
                success: true,
              });
            }
          });
        });
      }
    }
  );
});

//sign in
app.get("/signin", (req, res) => {
  res.render("login", {});
});

app.post("/signin", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  const newUser = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(newUser, (err) => {
    if (err) {
      res.render("error", { message: err, isAuth: isAuth, success: false });
    } else {
      passport.authenticate("local")(req, res, () => {
        res.render("error", {
          message: "loged in successfully!!",
          isAuth: isAuth,
          success: true,
        });
      });
    }
  });
});

//for log out
app.get("/logout", (req, res) => {
  let isAuth = false;
  if (req.isAuthenticated()) {
    isAuth = true;
  }
  if (req.isAuthenticated()) {
    req.logout();
    res.render("error", {
      message: "loged out successfully!!",
      isAuth: isAuth,
      success: true,
    });
  } else {
    res.render("error", {
      message: "oops!! not log in",
      isAuth: isAuth,
      success: false,
    });
  }
});

//connect with server
let port = process.env.PORT;
if (port == null || port == "") {
  port = 5000;
}

app.listen(port, (err) => {
  if (err) {
    console.log("some error!!!!!!!!");
  } else {
    console.log(`open to localhost:${port}`);
  }
});
