DROP TABLE IF EXISTS petition;

CREATE TABLE petition (
    id SERIAL PRIMARY KEY,
    first VARCHAR NOT NULL CHECK (first != ''),
    last VARCHAR NOT NULL CHECK (last != ''),
    timeSt VARCHAR NOT NULL CHECK (timeSt != ''),
    signature VARCHAR NOT NULL CHECK (signature != '')
);
