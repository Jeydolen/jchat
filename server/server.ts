const express = require('express');
const sessions = require('express-session');
const helmet = require('helmet');
const csurf = require('csurf');
const http = require('http');

const { db, TABLES } = require('./db.ts');

if (process.env.secret == undefined)
{
  // Don't start app if there is no secret to sign cookies
  console.log("Error: Secret needs to be defined in environement variables");
  process.exit(1);
}

if (process.env.web_port == undefined)
{
  // Don't start app if there is no secret to sign cookies
  console.log("Error: Express port needs to be defined in environement variables");
  process.exit(2);
}

if (process.env.pg_pwd == undefined)
{
  console.log("You have to provide a PostgreSQL password");
  process.exit(4);
}

if (process.env.pg_user == undefined)
{
  console.log("No PostgreSQL username provided using default one (postgres).");
}

const app = express();

app.use(sessions({
  secret: process.env.secret,
  store: new (require('connect-pg-simple')(sessions))({
    // Insert connect-pg-simple options here
    conObject: {
      user: process.env.pg_user || 'postgres',
      password: process.env.pg_pwd,
      database: 'jchat'
    }
  }),
  saveUninitialized: true,
  resave: false 
}));

// Basic security middlewares
// https://expressjs.com/en/advanced/best-practice-security.html
app.use(helmet());
//app.use(csurf({ cookie: true }))


// TODO: Add rate limits to prevent DDOS kind of attacks


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// TODO: Replace with https
const httpServer = http.createServer(app);

// The server side needs to handle 2 things: authentication and communication
// When a user send a message it goes trough server first and then server send it to any other users that have access to this message

app.use(require('./authentication.route.ts').app);
app.use(require('./channels.route.ts').app);
app.use(require('./messages.route.ts').app);



const wss = require('./websocket.ts').wss;

httpServer.on('upgrade', async (req, socket, head) => { 
  wss.handleUpgrade(req, socket, head, async (ws) => {
    // Authentication
    if (req.headers.cookie === undefined || req.headers.cookie === '')
    {
      wss.emit('close', ws, req);
      return;
    }
    
    req.sid = req.headers.cookie.split('connect.sid=s%3A')[1].split('.')[0];
    
    // If cookie exist and is in db autorize ws connection
    const validSession = await db.select('expire')
                                 .from(TABLES.SESSION)
                                 .where('sid', req.sid);
    const isExpired = Date.now() > Date.parse(validSession[0].expire);
    if (validSession.length == 0 || isExpired)
    {
      wss.emit('close', ws, req);
      return;
    }
    wss.emit('connection', ws, req);
  });
});


console.log('Listening on: ', process.env.web_port);
httpServer.listen(process.env.web_port);
