const { Router } = require('express');

const { auth_middleware } = require('./authentication.route.ts');
const { channel_middleware } = require('./channels.route.ts');
const { db, TABLES } = require('./db.ts');
const router = Router();

router.get('/messages/list', auth_middleware, channel_middleware, async (req, res) => {
  const result = await db.select('content', 'source_id', 'date')
                         .from(TABLES.MESSAGES)
                         .where({channel_id: req.cid})
                         .orderBy('date');
  res.status(200).json(result);
});

exports.app = router;