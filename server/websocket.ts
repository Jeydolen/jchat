const { WebSocketServer } = require('ws');

const { db, TABLES } = require('./db.ts');

const getUID = (sid) => 
  db.select('sess')
    .from(TABLES.SESSION)
    .where({sid: sid});

const wss = new WebSocketServer({ noServer: true, clientTracking: true });
wss.on('connection', async (ws, req) => {
  // When new client connects, get all his channels
  const uid = await getUID(req.sid);
  if (uid.length === 0) { return; }

  ws.uid = uid[0].sess.uid;
  const res = await db.select('cid')
                      .from(TABLES.CHANNELS)
                      .where({user_id: ws.uid});

  ws.channels = res.map((obj) => obj.cid);

  ws.on('message', async (data) => {
    let json;
    try { json = JSON.parse(data); }
    catch (e) { return; }

    const { message, channel } = json;
    if (message === undefined || channel === undefined)
    {
      return;
    }

    if (ws.channels.find((el) => el === channel) === undefined)
    {
      return;
    }

    // Validation done
    // Get all user ids connected to specific channel
    const uids = await db.select('user_id')
                         .from(TABLES.CHANNELS)
                         .where({cid: json.channel});
                         
    wss.clients.forEach(client => {
      if (uids.find((id) => id.user_id == client.uid) !== undefined)
      {
        // Don't send message to yourself
        if (client !== ws)
        {
          client.send(json.message);
        }
      }
    });

    const db_data = {
      date: new Date(Date.now()).toISOString(), 
      content: json.message, 
      source_id: ws.uid, 
      channel_id: channel
    };
    await db.insert(db_data).into(TABLES.MESSAGES);
  });
});

const interval = setInterval(function ping() {
  for (let i = 0; i < wss.clients.length; i++)
  {
    let ws = wss.clients[i];
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => { clearInterval(interval); });

exports.wss = wss;