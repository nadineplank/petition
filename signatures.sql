DROP TABLE IF EXISTS signatures;

CREATE TABLE signatures (
    id SERIAL PRIMARY KEY,
    timeSt VARCHAR NOT NULL CHECK (timeSt != ''),
    sig VARCHAR NOT NULL CHECK (sig != ''),
    user_id INT REFERENCES users(id) NOT NULL UNIQUE
);
