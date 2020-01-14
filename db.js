const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");

exports.showSignature = function(id) {
    return db
        .query(`SELECT sig FROM signatures WHERE user_id = ${id}`)
        .then(({ rows }) => rows);
};

exports.getSigners = function() {
    return db
        .query(
            `SELECT users.first, users.last, user_profiles.age, user_profiles.city, user_profiles.url, signatures
        FROM users
        JOIN user_profiles
        ON users.id = user_profiles.user_id
        JOIN signatures
        ON users.id = signatures.user_id`
        )
        .then(({ rows }) => rows);
};

exports.getSignersByCity = function(city) {
    return db
        .query(
            `SELECT users.first, users.last, users_profiles.age, user_profiles.city, user_profiles.url, signatures
        FROM users
        JOIN user_profiles
        ON users.id = user_profiles.user_id
        JOIN signatures
        ON users.id = signatures.user_id
        WHERE user_profiles.city = '${city}'`
        )
        .then(({ rows }) => rows);
};

exports.addSigner = function(timeSt, sig, id) {
    return db.query(
        `INSERT INTO signatures (timeSt, sig, user_id)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [timeSt, sig, id]
    );
};

exports.addUser = function(firstName, lastName, email, password) {
    return db.query(
        `INSERT INTO users (first, last, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [firstName, lastName, email, password]
    );
};

exports.addProfile = function(age, city, url, id) {
    return db.query(
        `INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id`,
        [age, city, url, id]
    );
};

exports.login = function(email) {
    return db
        .query(`SELECT password FROM users WHERE email = '${email}'`)
        .then(({ rows }) => rows);
};
