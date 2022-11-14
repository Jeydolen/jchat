const { Router } = require('express');

const { auth_middleware } = require('./authentication.route.ts');
const { channel_middleware } = require('./channels.route.ts');
const { db, TABLES } = require('./db.ts');
const router = Router();

router.get('/messages/list', auth_middleware, async (req, res) => {
  const cid = parseInt(req.query.channel_id);
  if (req.query.channel_id === undefined || Number.isNaN(cid))
  {
    res.status(403).json({error: 'Channel ID is invalid'});
    return;
  }
  const result = await db.select('content', 'source_id', 'date', 'users.username')
  .from(TABLES.MESSAGES)
  .distinct()
  .innerJoin(TABLES.USERS, 'users.index', '=', 'source_id')
  .innerJoin(TABLES.CHANNELS_TO_USERS, 'channels_to_users.user_id', '=', req.session.uid)
  .where({'messages.channel_id': cid})
  .orderBy('date');
  res.status(200).json(result);
});

exports.app = router;
