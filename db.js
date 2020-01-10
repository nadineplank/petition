const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");

exports.getSigners = function() {
    return db
        .query(`SELECT first, last, timeSt FROM signatures`)
        .then(({ rows }) => rows);
};

exports.addSigner = function(firstName, lastName, timeSt, signature) {
    return db.query(
        `INSERT INTO signatures (first, last, timeSt, signature)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [firstName, lastName, timeSt, signature]
    );
};
