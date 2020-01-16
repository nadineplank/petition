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
    if (req.session.userId) {
        if (req.session.profileId) {
            if (req.session.signatureId) {
                res.redirect("/thanks");
            } else {
                res.redirect("/petition");
            }
        } else {
            res.redirect("/profile");
        }
    } else {
        res.redirect("/register");
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
    db.addProfile(age, city, url, id).then(data => {
        req.session.profileId = data.rows[0].user_id;
        res.redirect("/petition");
    });
});

///////// PROFILE EDIT

app.get("/profile/edit", (req, res) => {
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
    //Determine what query to do for the users table based on whether or not the user typed a new password and do it
    if (password === null) {
        Promise.all([
            db.updateProfile(age, city, url, id),
            db.updateUser(id, first, last, email)
        ])
            .then(data => {
                res.render("edit", {
                    data,
                    updated: true
                });
            })
            .catch(err => {
                console.log("error in updateProfile: ", err);
            });
    } else {
        bcrypt.hash(password).then(hashedPass => {
            db.updatePassword(hashedPass, id).then(() => {
                Promise.all([
                    db.updateProfile(age, city, url, id),
                    db.updateUser(id, first, last, email)
                ])
                    .then(data => {
                        res.render("edit", {
                            data,
                            updated: true
                        });
                    })
                    .catch(err => {
                        console.log("error in updateProfile: ", err);
                    });
            });
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
                if (result) {
                    req.session.userId = data[0].id;
                    if (data[0].user_id) {
                        req.session.profileId = data[0].user_id;
                    }
                    if (data[0].signature) {
                        req.session.signatureId = data[0].signature;
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
    req.session.user_id = null;
    res.redirect("/register");
});

//// petition

app.get("/petition", (req, res) => {
    res.render("petition");
});

app.post("/petition", (req, res) => {
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
app.get("/thanks", (req, res) => {
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
