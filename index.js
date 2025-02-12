const db = require("./db");
const express = require("express");
const app = express();
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const {
    requireSignature,
    requireNoSignature,
    requireLoggedOutUser
} = require("./middleware");

let secrets;
if (process.env.NODE_ENV === "production") {
    secrets = process.env;
} else {
    secrets = require("./secrets");
}

const csurf = require("csurf");
const bcrypt = require("./bcrypt");

// const redis = require("./redis");

const url = require("url");
const querystring = require("querystring");

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
        secret: secrets.SESSION_SECRET,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);
app.use(csurf());

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use((req, res, next) => {
    if (!req.session.userId && req.url != "/login" && req.url != "/register") {
        res.redirect("/register");
    } else {
        next();
    }
});

//////// REGISTER

app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/register", requireLoggedOutUser, (req, res) => {
    res.render("register");
});

app.post("/register", requireLoggedOutUser, (req, res) => {
    let firstName = req.body.first,
        lastName = req.body.last,
        email = req.body.email;

    ///// hash the submitted password
    bcrypt.hash(req.body.password).then(hashedPass => {
        // put the first, last, email and hashed password into the users table
        db.addUser(firstName, lastName, email, hashedPass)
            .then(function(data) {
                // upon success put the user's id into req.session and redirect to the petition
                req.session.userId = data.rows[0].id;
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
        id = req.session.userId;
    if (age === "") {
        age = null;
    }
    db.addProfile(age, city, url, id)
        .then(data => {
            req.session.profileId = data.rows[0].user_id;
            res.redirect("/petition");
        })
        .catch(err => {
            console.log("err in profile: ", err);
            res.render("profile");
        });
});

///////// PROFILE EDIT

app.get("/profile/edit", (req, res) => {
    let parsedUrl = url.parse(req.url);
    let updated = querystring.parse(parsedUrl.query);

    if (updated.updated) {
        db.getProfile(req.session.userId)
            .then(data => {
                res.render("edit", {
                    data,
                    updated
                });
            })
            .catch(err => {
                console.log("err in getProfile: ", err);
                res.render("edit", { err });
            });
    } else {
        db.getProfile(req.session.userId)
            .then(data => {
                res.render("edit", {
                    data
                });
            })
            .catch(err => {
                console.log("err in getProfile: ", err);
                res.render("edit", { err });
            });
    }
});

app.post("/profile/edit", (req, res) => {
    let first = req.body.first,
        last = req.body.last,
        email = req.body.email,
        age = req.body.age,
        password = req.body.password,
        city = req.body.city,
        url = req.body.url,
        id = req.session.userId;
    if (age === "") {
        age = null;
    }
    //Determine what query to do for the users table based on whether or not the user typed a new password and do it
    if (!password) {
        Promise.all([
            db.updateProfile(id, age, city, url),
            db.updateUser(id, first, last, email)
        ])
            .then(() => {
                res.redirect("/profile/edit/?updated=true");
            })
            .catch(err => {
                console.log("error in updateProfile1: ", err);
            });
    } else {
        bcrypt
            .hash(password)
            .then(hashedPass => {
                Promise.all([
                    db.updatePassword(hashedPass, id),
                    db.updateProfile(id, age, city, url),
                    db.updateUser(id, first, last, email)
                ])
                    .then(() => {
                        res.redirect("/profile/edit/?updated=true");
                    })

                    .catch(err => {
                        console.log("error in updateProfile2: ", err);
                    });
            })
            .catch(err => {
                console.log("Error in updatePassword: ", err);
            });
    }
});

// POST /signature/delete
app.post("/sig/delete", (req, res) => {
    // Does the delete query
    let id = req.session.userId;
    db.deleteSig(id).then(function() {
        // Upon success
        // make sure that req.session knows that the user no long has a signature
        req.session.signatureId = null;
        // redirect to /petition
        res.redirect("/petition");
    });
});

///////// LOGIN

app.get("/login", requireLoggedOutUser, (req, res) => {
    res.render("login");
});

app.post("/login", requireLoggedOutUser, (req, res) => {
    let email = req.body.email,
        password = req.body.password;

    // - find the info from the user's table by the submitted email address
    db.login(email)
        .then(data => {
            // - compare the submitted password to the saved hashed password from the database using bcrypt's compare
            bcrypt.compare(password, data[0].password).then(result => {
                if (result) {
                    req.session.userId = data[0].id;
                    if (data[0].user_id) {
                        req.session.profileId = data[0].user_id;
                    }
                    if (data[0].signature) {
                        req.session.signatureId = data[0].signature;
                        console.log(req.session.signatureId);
                    }
                    res.redirect("/");
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

////// Logout
app.get("/logout", (req, res) => {
    delete req.session.userId;
    res.redirect("/register");
});

//// petition

app.get("/petition", requireNoSignature, (req, res) => {
    res.render("petition");
});

app.post("/petition", requireNoSignature, (req, res) => {
    let signature = req.body.signature,
        id = req.session.userId,
        timeSt = new Date();

    db.addSigner(timeSt, signature, id)

        .then(() => {
            req.session.signatureId = true;
            res.redirect("/thanks");
        })
        .catch(function(err) {
            console.log("err in addSigner: ", err);
            res.render("petition", { err });
        });
});

///////// THANKS
app.get("/thanks", requireSignature, (req, res) => {
    let id = req.session.userId;
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

app.get("/signers", requireSignature, (req, res) => {
    db.getSigners()
        .then(data => {
            res.render("signers", {
                data
            });
        })
        .catch(err => console.log("err in signers: ", err));
});

app.get("/signers/:city", requireSignature, (req, res) => {
    db.getSignersByCity(req.params.city)
        .then(result => {
            res.render("signers", {
                result
            });
        })
        .catch(err => console.log("err in getSignersByCity: ", err));
});

app.listen(process.env.PORT || 8080, () => console.log("port listening"));
