const { Router } = require('express');
const bcrypt = require('bcrypt');
const {
  isEmail, 
  normalizeEmail, 
  isStrongPassword 
} = require('validator');

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
  if (req.body.email === undefined || ! isEmail(req.body.email))
  {
    res.status(403).send('No email provided');
    return;
  }

  const email = normalizeEmail(req.body.email);

  if (req.body.password == undefined)
  {
    res.status(403).send('No password provided');
    return;
  }

  const password = req.body.password;

  if (! isStrongPassword(password))
  {
    res.status(403).send('Password is not strong enough');
    return;
  }

  if (req.body.username == undefined || typeof req.body.username !== 'string')
  {
    res.status(403).send('No username provided');
    return;
  }

  if (req.body.username.length < 3 || req.body.username.length > 40)
  {
    res.status(403).send('Username should have a length between 3 and 39');
    return;
  }
  
  const emailExist = await db.select('email').from(TABLES.USERS).where('email', email);
  if (emailExist.length != 0)
  {
    // Account exist for this email
    res.status(200).send('This account already exist.');
    return;
  }

  // Account doesn't exist -> creating it
  const hashed_password = await bcrypt.hash(req.body.password, 10);
  await db.insert({ email: email, hash: hashed_password, username: req.body.username}).into(TABLES.USERS);
  res.redirect('/login');
});

router.post('/login', async (req, res, next) => {
  if (req.body.email === undefined || ! isEmail(req.body.email))
  {
    res.status(403).send('No email provided');
    return;
  }

  const email = normalizeEmail(req.body.email);

  if (req.body.password == undefined)
  {
    res.status(403).send('No password provided');
    return;
  }

  const password = req.body.password;
  
  const hash = await db.select('hash', 'index').from('users').where('email', email);

  if (hash.length == 0)
  {
    res.status(400).send('This account does not exist');
    return;
  }

  const pwdCheck = await bcrypt.compare(password, hash[0].hash);
  
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
  res.redirect('/login');
});

exports.app = router;
exports.auth_middleware = auth_middleware;