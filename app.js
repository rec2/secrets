//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParse = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParse.urlencoded({
    extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});



// Schema and model
const userSchema = mongoose.Schema({
    email: String,
    password: String
});

const User = mongoose.model("User", userSchema);

app.route("/")
    .get(function (req, res) {
        res.render("home");
    });


app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })
    .post(function (req, res) {
        const username = req.body.username;
        const password = req.body.password;

        // match user name with db, validate db password
        User.findOne({
            email: username
        }, function (err, foundUser) {
            if (err) {
                console.log(err);
            } else {
                if (foundUser) {
                    bcrypt.compare(password, foundUser.password, function(err, result) {
                        if(result === true) {
                            res.render("secrets");
                        }
                    });
                }
            }
        });
    });

app.route("/register")
    .get(function (req, res) {
        res.render("register");
    })

    .post(function (req, res) {
        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {

            const newUser = new User({
                email: req.body.username,
                password: hash
            });
            newUser.save(function (err) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("secrets");
                }
            });

        })
    });


app.listen(3000, function () {
    console.log("Server up and running on port 3000");
})