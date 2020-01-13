const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");
const dbUser = spicedPg("postgres:postgres:postgres@localhost:5432/users");

exports.showSignature = function(id) {
    return db
        .query(`SELECT sig FROM signatures WHERE id = ${id}`)
        .then(({ rows }) => rows);
};

exports.getSigners = function() {
    return db
        .query(`SELECT first, last, timeStFROM signatures`)
        .then(({ rows }) => rows);
};

exports.addSigner = function(firstName, lastName, timeSt, sig) {
    return db.query(
        `INSERT INTO signatures (first, last, timeSt, sig)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [firstName, lastName, timeSt, sig]
    );
};

exports.addUser = function(firstName, lastName, email, password) {
    return dbUser.query(
        `INSERT INTO users (first, last, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [firstName, lastName, email, password]
    );
};

exports.login = function(email) {
    return dbUser
        .query(`SELECT password FROM users WHERE email = '${email}'`)
        .then(({ rows }) => rows);
};
