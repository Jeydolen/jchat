const { Router } = require('express');
const bcrypt = require('bcrypt');

const { db, TABLES } = require('./db.ts');

const router = Router();

const auth_middleware = (req, res, next) => {
  if (req.session.uid === undefined)
  {
    res.status(403).send('Forbidden');
    return;
  }
  next();
};


router.post('/register', async (req, res) => {
  // POST request data is stored in req.body
  // TODO: Sanitize email
  if (req.body.email == undefined)
  {
    res.status(403).send('No email provided');
    return;
  }

  if (req.body.password == undefined)
  {
    res.status(403).send('No password provided');
    return;
  }

  if (req.body.username == undefined)
  {
    res.status(403).send('No username provided');
    return;
  }
  
  const emailExist = await db.select('email').from(TABLES.USERS).where('email', req.body.email);
  if (emailExist.length != 0)
  {
    // Account exist for this email
    res.status(200).send('This account already exist.');
    return;
  }

  // Account doesn't exist -> creating it
  const hashed_password = await bcrypt.hash(req.body.password, 10);
  await db.insert({ email: req.body.email, hash: hashed_password, username: req.body.username}).into(TABLES.USERS);
  res.send('Account successfully created !');
});

router.post('/login', async (req, res, next) => {
  if (req.body.email == undefined)
  {
    res.status(403).send('No email provided');
    return;
  }

  if (req.body.password == undefined)
  {
    res.status(403).send('No password provided');
    return;
  }
  
  const hash = await db.select('hash', 'index').from('users').where('email', req.body.email);

  if (hash.length == 0)
  {
    res.status(400).send('This account does not exist');
    return;
  }

  const pwdCheck = await bcrypt.compare(req.body.password, hash[0].hash);
  
  // Wrong password
  if (! pwdCheck)
  {
    res.status(403).send('Wrong password');
    return;
  }


  req.session.regenerate(function (err) {
    if (err) next(err)

    // store user information in session, typically a user id
    req.session.uid = hash[0].index;

    // save the session before redirection to ensure page
    // load does not happen before session is saved
    req.session.save(function (err) {
      if (err) return next(err)
      res.redirect('/')
    });
  });
});

router.get('/logout', (req, res) => {
  req.session.uid = null
  req.session.destroy();
  res.send('Disconnected.');
});

exports.app = router;
exports.auth_middleware = auth_middleware;