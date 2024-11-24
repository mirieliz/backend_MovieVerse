import pg from 'pg';

// esquema de identado para pg
export const pool = new pg.Pool({

    user: process.env.USER,
    host: process.env.HOST,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    port: process.env.PORT,

    // user: 'postgres',
    // host: 'localhost',
    // password: '1234',
    // database: 'movieverse',
    // port: '5432',
})
