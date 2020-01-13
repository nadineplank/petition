const db = require("./db");
const express = require("express");
const app = express();
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const { SESSION_SECRET: sessionSecret } = require("./secrets.json");
const csurf = require("csurf");
const bcrypt = require("./bcrypt");

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
        secret: sessionSecret,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);
app.use(csurf());

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

//// petition start page

app.get("/petition", (req, res) => {
    res.render("petition");
});

app.post("/petition", (req, res) => {
    let firstName = req.body.first,
        lastName = req.body.last,
        signature = req.body.signature,
        timeSt = new Date();

    db.addSigner(firstName, lastName, timeSt, signature)

        .then(function(data) {
            req.session.id = data.rows[0].id;

            res.redirect("/thanks");
        })
        .catch(function(err) {
            console.log("err in addSigner: ", err);
            res.render("petition", { err });
        });
});

//////// REGISTER

app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    let firstName = req.body.first,
        lastName = req.body.last,
        email = req.body.email;
    ///// hash the submitted password
    bcrypt.hash(req.body.password).then(hashedPass => {
        // put the first, last, email and hashed password into the users table
        db.addUser(firstName, lastName, email, hashedPass)
            .then(function(data) {
                // upon success put the user's id into req.session and redirect to the petition
                req.session.id = data.rows[0].id;
                res.redirect("/petition");
            })
            // upon failure, re-render the register template with an error message
            .catch(function(err) {
                console.log("err in register: ", err);
                res.render("register", { err });
            });
    });
});

///////// LOGIN

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    let email = req.body.email,
        password = req.body.password;
    // - find the info from the user's table by the submitted email address
    db.login(email)
        .then(data => {
            // - compare the submitted password to the saved hashed password from the database using bcrypt's compare
            bcrypt.compare(password, data[0].password).then(result => {
                if (result === true) {
                    // - if the passwords match
                    //     -  put the user's id in session (i.e., log them in)
                    req.session.user_id = data[0].id;
                    // req.session.first = data[0].first;
                    // req.session.last = data[0].last;
                    //     - get their signature id and put it in session if it exists
                    //       redirect to /petition
                    res.redirect("/petition");
                } else {
                    res.render("login", { wrongPass: true });
                }
            });
        })
        // - if there is no match, re-render the template with an error message
        .catch(function(err) {
            console.log("err in login: ", err);
            res.render("login", { err });
        });
});

///////// THANKS
app.get("/thanks", (req, res) => {
    let id = req.session.id;
    db.showSignature(id)
        .then(result => {
            let sig = result[0].sig;
            console.log("signature: ", sig);
            res.render("thanks", {
                sig
            });
        })
        .catch(err => console.log("err in showSignature: ", err));
});

app.get("/signers", (req, res) => {
    db.getSigners()
        .then(data => {
            res.render("Signers", {
                data
            });
        })
        .catch(err => console.log("err in signers: ", err));
});

app.listen(8080, () => console.log("port 8080 listening"));
