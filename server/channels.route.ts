const { Router } = require('express');
const { isISO8601 } = require('validator');

const { auth_middleware } = require('./authentication.route.ts');
const { db, TABLES } = require('./db.ts');
const router = Router();

const channel_middleware = (req, res, next) => {
  const cid = parseInt(req.body.channel_id);
  if (req.body.channel_id === undefined || Number.isNaN(cid))
  {
    res.status(403).json({error: 'Channel ID is invalid'});
    return;
  }
  req.cid = cid;
  next();
};

router.get('/channels/list', auth_middleware, async (req, res) => {
  const result = await db.select('channel_id as id', 'channels.owner_id')
  .from(TABLES.CHANNELS_TO_USERS)
  .join(TABLES.CHANNELS, 'channels.index', 'channel_id')
  .where({'user_id': req.session.uid});
  
  res.status(200).json(result);
});

router.post('/channels/create', auth_middleware, async (req, res) => {
  const pub = req.body.public;
  if (pub !== undefined && typeof pub !== "boolean")
  {
    res.send(400).send('public must be a boolean');
    return;
  }

  const cid = await db.returning('index as cid')
  .insert({ owner_id: req.session.uid, public: pub || false })
  .into(TABLES.CHANNELS);

  await db.insert({ channel_id: cid[0].cid, user_id: req.session.uid})
  .into(TABLES.CHANNELS_TO_USERS);

  res.status(200).send('Channel created with id: ' + cid[0].cid);
});

router.post('/channels/delete', auth_middleware, channel_middleware, async (req, res) => {
  const result = await db.select('owner_id')
  .from(TABLES.CHANNELS)
  .where({index: req.cid, owner_id: req.session.uid})

  if (result.length === 0)
  {
    res.status(403).send('You don\'t own this channel !');
    return;
  }

  await db.del()
  .where({channel_id: req.cid})
  .from(TABLES.CHANNELS_TO_USERS);

  await db.del()
  .where({channel_id: req.cid})
  .from(TABLES.INVITATIONS);

  await db.del()
  .where({channel_id: req.cid})
  .from(TABLES.MESSAGES);

  await db.del()
  .where({index: req.cid})
  .from(TABLES.CHANNELS);

  res.status(200).send('Channel removed with id: ' + req.cid);
});

router.post('/channels/invite', auth_middleware, channel_middleware, async (req, res) => {
  // If user is not owner of channel or have perm to invite then return
  const result = await db.select('owner_id', 'public')
  .from(TABLES.CHANNELS)
  .where({index: req.cid});

  if (result.length === 0)
  {
    res.status(401).json({error: 'This channel does not exist'});
    return;
  }

  if (! result[0].public && req.session.uid !== result[0].owner_id)
  {
    res.status(403).json({error: 'You are not permitted to invite people to this channel'});
    return;
  }

  if (req.body.expiration === undefined || req.body.max_use === undefined)
  {
    res.status(400).json({error: 'You have to specify a maximum usage and expiration'});
    return;
  }

  const { expiration, max_use } = req.body;

  // If expiration isn't a ISO8601 date or false then return
  if (expiration !== null && (typeof expiration !== 'string' || ! isISO8601(expiration)))
  {
    res.status(400).json({error: 'Expiration must be either null or valid iso8601 date'});
    return;
  }

  if (typeof max_use !== 'string' && typeof max_use !== 'number' && Number.isNaN(parseInt(max_use)))
  {
    res.status(400).json({error: 'Max use must be an integer'});
    return;
  }

  const id = require('randomstring').generate();
  const db_data = {
    created: new Date(Date.now()).toISOString(),
    remaining_use: parseInt(max_use),
    source_id: req.session.uid,
    channel_id: req.cid,
    expiration: expiration,
    identifier: id
  };
  await db.insert(db_data).into(TABLES.INVITATIONS);
  res.status(200).json({status: 'Invite created with id: ' + id, invite_code: id});
});

router.post('/channels/join', auth_middleware, async (req, res) => {
  if (req.body.invite === undefined && req.body.channel_id === undefined)
  {
    res.status(400).json({error: "Either invite or channel_id must be defined !"});
    return;
  }

  const { channel_id, invite } = req.body;
  if (invite === undefined && (channel_id === undefined || Number.isNaN(parseInt(channel_id))))
  {
    res.status(403).json({error: 'Channel ID is invalid'});
    return;
  }

  if (channel_id !== undefined)
  {
    req.cid = parseInt(channel_id);
  }
  
  if (invite !== undefined)
  {
    // Check invite
    const invitation = await db.select('remaining_use', 'expiration', 'channel_id')
    .from(TABLES.INVITATIONS)
    .where({identifier: invite});

    if (invitation.length === 0)
    {
      res.status(403).json({error: 'Invite doesn\'t exist'});
      return;
    }

    // If we are past expiration date
    if (new Date(Date.parse(invitation[0].expiration)) < new Date(Date.now()))
    {
      res.status(403).json({error: 'Invite code expired !'});
      return;
    }

    if (invitation[0].remaining_use <= 0)
    {
      res.status(403).json({error: 'Invite code reached max uses !'});
      return;
    }

    req.cid = invitation[0].channel_id;

    // TODO Update invite
    await db.update({remaining_use: invitation[0].remaining_use - 1})
    .where({identifier: invite})
    .into(TABLES.INVITATIONS);
  }

  const result = await db.select('public', 'owner_id', 'channels_to_users.user_id')
  .from(TABLES.CHANNELS)
  .join(TABLES.CHANNELS_TO_USERS, 'channels_to_users.channel_id', 'channels.index')
  .where({'channels.index': req.cid});

  if (result.length === 0)
  {
    res.status(403).json({error: 'This channel doesn\'t exist !'});
    return;
  }
  
  const user_ids = result.map(obj => obj.user_id);
  if (user_ids.find(id => id === req.session.uid) !== undefined)
  {
    res.status(403).json({error: 'Channel already joined !'});
    return;
  }

  // If channel is not public and user didn't got invite
  if (result[0].public === false && req.body.invite === undefined)
  {
    res.status(400).json({error: 'You are not allowed to join this channel !'});
    return;
  }
  
  // Add user to channel
  await db.insert({channel_id: req.cid, user_id: req.session.uid})
  .into(TABLES.CHANNELS_TO_USERS);

  res.status(200).json({status: 'Channel successfully joined !'});
});

router.post('/channels/leave', auth_middleware, channel_middleware, async (req, res) => {
  const uids = await db.select('channels_to_users.user_id', 'owner_id')
  .from(TABLES.CHANNELS)
  .join(TABLES.CHANNELS_TO_USERS, 'channels_to_users.channel_id', 'channels.index')
  .where({'channels.index': req.cid});

  let isOwner = false;
  const presence = uids.find(id => {
    if (id.owner_id === req.session.uid)
    {
      isOwner = true;
    }
    return id.user_id === req.session.uid
  });

  if (presence === undefined || isOwner)
  {
    res.status(403).send('User cannot leave channel !');
    return;
  }

  await db
  .where({channel_id: req.cid , user_id: req.session.uid})
  .from(TABLES.CHANNELS_TO_USERS).del();

  res.status(200).send('Successfully left channel: ' + req.cid);
});

exports.app = router;
exports.channel_middleware = channel_middleware;