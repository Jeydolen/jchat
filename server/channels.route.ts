const { Router } = require('express');

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
  const result = await db.select('cid as id')
                         .from(TABLES.CHANNELS)
                         .where({user_id: req.session.uid});
  res.status(200).json(result);
});

router.post('/channels/create', auth_middleware, async (req, res) => {
  // TODO: Make SQL transaction
  const result = await db.max('cid').from(TABLES.CHANNELS);
  const cid = result[0].max == null ? 0 : result[0].max + 1;
  await db.insert({ cid: cid, user_id: req.session.uid, owner_id: req.session.uid })
          .into(TABLES.CHANNELS);
  res.status(200).send('Channel created with id: ' + cid);
});

router.post('/channels/delete', auth_middleware, channel_middleware, async (req, res) => {
  const result = await db.returning('cid')
                         .where({cid: req.cid , owner_id: req.session.uid})
                         .from(TABLES.CHANNELS).del();
  if (result.length === 0)
  {
    res.status(403).send('You don\'t own this channel !');
    return;
  }

  res.status(200).send('Channel removed with id: ' + req.cid);
});

router.post('/channels/join', auth_middleware, channel_middleware, async (req, res) => {
  // TODO: Implements invite system
  // For now anyone knowning channel id can enter a channel

  const result = await db.select('user_id')
                         .from(TABLES.CHANNELS)
                         .where({cid: req.cid});

  const user_ids = result.map((obj) => obj.user_id);
  if (user_ids.find(id => id === req.session.uid) !== undefined)
  {
    res.status(403).send('Channel already joined !');
    return;
  }
  
  await db.insert({cid: req.cid, user_id: req.session.uid})
          .into(TABLES.CHANNELS);

  res.status(200).send('Successfully joined channel: ' + req.cid);
});

router.post('/channels/leave', auth_middleware, channel_middleware, async (req, res) => {
  const uids = await db.select('user_id', 'owner_id')
                       .from(TABLES.CHANNELS)
                       .where({cid: req.cid});

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

  await db.returning('cid')
          .where({cid: req.cid , user_id: req.session.uid})
          .from(TABLES.CHANNELS).del();

  res.status(200).send('Successfully left channel: ' + req.cid);
});

exports.app = router;
exports.channel_middleware = channel_middleware;