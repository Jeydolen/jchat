CREATE DATABASE jchat;

CREATE TABLE IF NOT EXISTS users (
  index SERIAL PRIMARY KEY UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channels (
  index SERIAL PRIMARY KEY UNIQUE NOT NULL,
  channel_id INTEGER UNIQUE NOT NULL,
  owner_id INTEGER NOT NULL,
  name TEXT
);

CREATE TABLE IF NOT EXISTS channels_to_users (
  index SERIAL PRIMARY KEY UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users(index),
  CONSTRAINT channel_id_fk FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
);

CREATE TABLE IF NOT EXISTS messages(
  index SERIAL PRIMARY KEY UNIQUE NOT NULL,
  date TIMESTAMP NOT NULL,
  content TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  CONSTRAINT source_id_fk FOREIGN KEY (source_id) REFERENCES users(index),
  CONSTRAINT channel_id_fk FOREIGN KEY (channel_id) REFERENCES channels(index)
);

CREATE TABLE IF NOT EXISTS invitations(
  index SERIAL PRIMARY KEY UNIQUE NOT NULL,
  created TIMESTAMP NOT NULL,
  remaining_use INTEGER NOT NULL,
  source_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  expiration TIMESTAMP,
  identifier TEXT NOT NULL,
  CONSTRAINT source_id_fk FOREIGN KEY (source_id) REFERENCES users(index),
  CONSTRAINT channel_id_fk FOREIGN KEY (channel_id) REFERENCES channels(cid)
);