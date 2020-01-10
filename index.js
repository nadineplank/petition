const db = require("./db");
const express = require("express");
const app = express();
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const { SESSION_SECRET: sessionSECRET } = require("./secrets");

// this configures express to use express-handlebars
app.engine("handlebars", hb());
app.set("view engine", "handlebars");

// let's you serve your static files
app.use(express.static("./public"));
app.use(
    express.urlencoded({
        extended: false
    })
);
app.use(
    cookieSession({
        secret: sessionSECRET,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);
app.use(csurf());

app.use(function(req, res, next) {
    res.set("x-frame-options", "DENY");
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.get("/", (req, res) => {
    req.session.peppermint;
    res.redirect("/petition");
});

app.get("/petition", (req, res) => {
    res.render("petition");
});

app.post("/petition", (req, res) => {
    let firstName = req.body.first,
        lastName = req.body.last,
        signature = req.body.signature,
        timeSt = new Date();

    db.addSigner(firstName, lastName, timeSt, signature)
        .then(function() {
            res.redirect("/thanks");
        })
        .catch(function(err) {
            console.log("err: ", err);
            res.render("petition", { err });
        });
});

app.get("/thanks", (req, res) => {
    res.render("thanks");
});

app.post("/thanks", (req, res) => {
    db.getSigners()
        .then(data => {
            console.log("data: ", data);
            res.render("thanks", {
                data
            });
        })
        .catch(err => console.log("err in thanks: ", err));
});

app.listen(8080, () => console.log("port 8080 listening"));
