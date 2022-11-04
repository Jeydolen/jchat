const knex = require('knex')({
  client: 'pg',
  connection: {
    user: process.env.pg_user || 'postgres',
    password: process.env.pg_pwd,
    database: 'jchat'
  },
});

const TABLES = {
  CHANNELS: 'channels',
  SESSION: 'session',
  USERS: 'users',
  MESSAGES: 'messages'
};

exports.db = knex;
exports.TABLES = TABLES;