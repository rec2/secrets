//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParse = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParse.urlencoded({
    extended: true
}));

// always place before coonnetcion ***
// initial configs to allow cookies
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
    //   cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

// Schema and model
const userSchema = new mongoose.Schema({
    email : String,
    password : String,
    googleId : String,
    secret : {}
});

//passport local monggose plugin
// used to hash/salt and save user into database
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
// changed this local method to passport's 
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
  
// use to iniitialize Face Strategy 


// use to initialize Google strategy
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.route("/")
    .get(function (req, res) {
        res.render("home");
    });

// Google Authorization
app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile"]
    }))

app.get("/auth/google/secrets",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

// Login Route
app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })
    .post(function (req, res) {

        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, function (err) {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("secrets");
                });
            }
        });
    });

// Logout 
app.get("/logout", function (req, res) {
    req.logOut();
    res.redirect("/");
});

// Register
app.route("/register")
    .get(function (req, res) {
        res.render("register");
    })

    .post(function (req, res) {
        User.register({
            username: req.body.username
        }, req.body.password, function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        });
    })


// Secrets
app.route("/secrets")
    .get(function (req, res) {
        // find users with secerts property that are not null
        User.find({"secret" : {$ne : null}}, function(err, foundUsers){
            if (err) {
                console.log(err);
            } else {
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        })
    });

// Submit
app.route("/submit")
    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    })
    .post(function (req,res) {
        const submittedSecret = req.body.secret;

        // Find a user that matches USER.ID and add secret to their object
        User.findById(req.user.id, function(err, foundUser) {
            if (err) {
                console.log(err);
            } else {
                if (foundUser) {
                    foundUser.secret = submittedSecret;
                    foundUser.save(function() {
                        res.redirect("/secrets");
                    })
                }
            }
        })
    });


app.listen(3000, function () {
    console.log("Server up and running on port 3000");
})