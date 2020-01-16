const spicedPg = require("spiced-pg");

const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);

/////// SIGNATURE
exports.addSigner = function(timeSt, sig, user_id) {
    return db.query(
        `INSERT INTO signatures (timeSt, sig, user_id)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [timeSt, sig, user_id]
    );
};

exports.deleteSig = function(id) {
    return db.query(`DELETE FROM signatures WHERE user_id = ${id}`);
};

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
            `SELECT users.first, users.last, user_profiles.age, user_profiles.city, user_profiles.url, signatures
        FROM user_profiles
        JOIN users
        ON users.id = user_profiles.user_id
        JOIN signatures
        ON users.id = signatures.user_id
        WHERE LOWER(user_profiles.city) = LOWER('${city}')`
        )
        .then(({ rows }) => rows);
};

////// USER

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

exports.getProfile = id => {
    return db
        .query(
            `SELECT * FROM users
        LEFT JOIN signatures
        ON users.id = signatures.user_id
        LEFT JOIN user_profiles
        ON users.id = user_profiles.user_id
        WHERE users.id = '${id}'`
        )
        .then(({ rows }) => rows);
};

exports.updateUser = (id, first, last, email) => {
    return db.query(
        `UPDATE users SET first = ${first}, last = ${last}, email = ${email} WHERE id = ${id}`
    );
};

exports.updateProfile = function(age, city, url, id) {
    return db.query(
        `INSERT INTO user_profiles (user_id, age, city, url)
        VALUES (${id} ${age}, ${city}, ${url})
        ON CONFLICT (${id})
        DO UPDATE SET age = ${age}, city = ${city} url = ${url}`
    );
};

exports.updatePassword = function(password, id) {
    return db.query(`UPDATE users SET password = ${password} WHERE id = ${id}`);
};

// LOGIN

exports.login = function(email) {
    return db
        .query(
            `SELECT email, password, users.id, signatures.sig, user_profiles.user_id
            FROM users LEFT JOIN signatures
            ON users.id = signatures.user_id
            LEFT JOIN user_profiles ON users.id = user_profiles.user_id WHERE email = '${email}'`
        )
        .then(({ rows }) => rows);
};
