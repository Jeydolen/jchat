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
  CHANNELS_TO_USERS: 'channels_to_users',
  SESSION: 'session',
  USERS: 'users',
  MESSAGES: 'messages',
  INVITATIONS: 'invitations'
};

exports.db = knex;
exports.TABLES = TABLES;