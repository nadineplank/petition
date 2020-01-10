const db = require("./db");
const express = require("express");
const app = express();
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");

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
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

app.get("/", (req, res) => {
    req.session.peppermint;
    res.redirect("/petition");
});

app.get("/petition", (req, res) => {
    res.render("petition", {
        helpers: {}
    });
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

app.get("/signers", (req, res) => {
    db.getSigners().then(data =>
        res.render("signatures", {
            signatures: data
        })
    );
});

// db.addCity("Funky Town", "Funk", 420)
//     .then(function() {
//         return db.getCities();
//     })
//     .then(data => console.log(data));

// db.getCities().then(data => console.log(data));

// app.get("/cities", function(req, res) {
//     db.getCities().then(data =>
//         res.render("cities", {
//             cities: data
//         })
//     );
// });

app.listen(8080, () => console.log("port 8080 listening"));
