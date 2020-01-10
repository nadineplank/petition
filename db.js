const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");

exports.getSigners = function() {
    db.query(`SELECT first last  FROM signatures`).then(({ rows }) =>
        console.log(rows)
    );
};

exports.addSigner = function(firstName, lastName, timeSt, signature) {
    return db.query(
        `INSERT INTO signatures (first, last, timeSt, signature)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [firstName, lastName, timeSt, signature]
    );
};
