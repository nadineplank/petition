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

//////// REGISTER

app.get("/", (req, res) => {
    if (!req.session.id) {
        res.redirect("/register");
    } else if (!req.session.signatureId) {
        res.redirect("/petition");
    } else {
        res.redirect("/thanks");
    }
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
                res.redirect("/profile");
            })
            // upon failure, re-render the register template with an error message
            .catch(function(err) {
                console.log("err in register: ", err);
                res.render("register", { err });
            });
    });
});

//////// PROFILE

app.get("/profile", (req, res) => {
    res.render("profile");
});

app.post("/profile", (req, res) => {
    let age = req.body.age,
        city = req.body.city,
        url = req.body.url,
        id = req.session.id;
    db.addProfile(age, city, url, id).then(res.redirect("/petition"));
});

///////// PROFILE EDIT

app.get("/profile/edit", (req, res) => {
    // Do the query to get the current info for the user from the users and user_profiles tables so you can passed it to the template
    res.render("edit");
});

app.post("/profile/edit", (req, res) => {
    let first = req.body.first,
        last = req.body.last,
        age = req.body.age,
        city = req.body.city,
        url = req.body.url;
    //Determine what query to do for the users table based on whether or not the user typed a new password and do it
    //
    // if you need to update four, you must hash the password before passing first, last, email, and hashed password into the query
    // Do the upsert query for the user_profiles table
    //
    // if either query fails, re-render the template with an error message
    //
    // if both query's succeed, redirect somewhere sensible
    //
    // you can do both queries at the same time or you can do them sequentially
});

// POST /signature/delete
app.post("/sig/delete", (req, res) => {
    // Does the delete query
    db.deleteSig(id).then(function() {
        // Upon success
        // make sure that req.session knows that the user no long has a signature
        req.session.signatureId = null;
        // redirect to /petition
        res.redirect("/petition");
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
                    req.session.id = data[0].id;
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

//// petition

app.get("/petition", (req, res) => {
    res.render("petition");
});

app.post("/petition", (req, res) => {
    let signature = req.body.signature,
        timeSt = new Date();

    db.addSigner(timeSt, signature, req.session.id)

        .then(function(data) {
            req.session.signatureId = data.rows[0].id;
            res.redirect("/thanks");
        })
        .catch(function(err) {
            console.log("err in addSigner: ", err);
            res.render("petition", { err });
        });
});

///////// THANKS
app.get("/thanks", (req, res) => {
    let id = req.session.id;
    db.showSignature(id)
        .then(result => {
            db.getSigners().then(data => {
                let count = data.length;
                let sig = result[0].sig;
                res.render("thanks", {
                    sig,
                    count
                });
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

app.get("/signers/:city", (req, res) => {
    db.getSignersByCity(req.params.city)
        .then(result => {
            res.render("Signers", {
                result
            });
        })
        .catch(err => console.log("err in getSignersByCity: ", err));
});

app.listen(process.env.PORT || 8080, () => console.log("port listening"));
