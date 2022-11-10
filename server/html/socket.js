let websocket;
let previousMsg = null;
let currentChannel;
let channels = {};

const cookie = document.cookie;
const username = cookie.split(';').find(el => el.trim().startsWith('username=')).split('username=')[1];
const uid = parseInt(cookie.split(';').find(el => el.trim().startsWith('uid=')).split('uid=')[1]);

const receiveMsg = (element) => {
  if (element.content === undefined)
  {
    return;
  }

  const message = element.content;
  const messages = document.getElementById('messages');

  // Removing default message if exists
  const default_msg = document.getElementById('default-content')
  if (default_msg !== null)
  {
    messages.removeChild(default_msg);
  }

  // If user that sent the message is the same as previously and 
  // both message have less than 5 minute difference then put in the same block
  if (element.source_id !== undefined 
      && previousMsg !== null
      && previousMsg.source_id === element.source_id
      && (Date.parse(previousMsg.date) + (30000)) >= Date.parse(element.date))
  {
    const node_arr = document.getElementsByClassName('message');
    const msgDiv = node_arr[node_arr.length - 1];
    msgDiv.innerText += "\n" + message;
  }
  else
  {
    const date = new Date(Date.parse(element.date));

    // Ugly way to say to js that date from server is UTC date
    date.setUTCHours(date.getHours());

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.innerText = `${element.username} ${date.toLocaleTimeString()}: \n ${message}`;
    messages.appendChild(msgDiv);
  }

  previousMsg = element;
  messages.scrollTop = messages.scrollHeight;
};

const cacheMessage = (message) =>
{
  const cachedMessages = Object.entries(channels).find(id => parseInt(id) === currentChannel);
  cachedMessages[1].push(message);
};

const sendMsg = () => {
  const message = document.getElementById('message-input');
  if (websocket !== undefined && message.value !== "" && currentChannel !== undefined)
  {
    websocket.send(JSON.stringify({"channel": currentChannel, "message": message.value}));
    message.username = username;

    const now = new Date(Date.now());
    now.setUTCMinutes(now.getMinutes() + now.getTimezoneOffset());

    message.date = now.toISOString();
    message.content = message.value;
    receiveMsg(message);

    // Add message to cache
    cacheMessage(message);
    message.value = "";
  }
};

const useEnter = (evt) => {
  if (evt.key == "Enter")
  {
    sendMsg();
    return;
  }
};

const defaultMessage = () => {
  const default_text = document.createElement("div");
  default_text.id = "default-content";
  default_text.innerText = "Uhh that looks empty.";
  return default_text;
}

const getMessages = async (cid) => {
  // Reset to default message container
  const messages = document.getElementById("messages");
  messages.innerText = "";
  messages.appendChild(defaultMessage());
  previousMsg = null;

  let result = [];
  const cachedMessages = Object.entries(channels).find(id => parseInt(id) === cid);
  const isInit = channels.initialized_channels.find(id => id === cid);
  if (cachedMessages !== undefined && isInit !== undefined)
  {
    result = cachedMessages[1].messages;
  }
  else
  {
    // Get messages only if new channel
    result = await fetch(`http://localhost:3000/messages/list?channel_id=${cid}`,
      {
        method: 'GET', 
        mode: 'cors', 
        credentials: 'include'
      }
    ).then(res => res.json())
    // Return empty array by default
    .catch(() => []);

    channels[cid].messages = result;
    channels.initialized_channels.push(cid);
  }
  
  result.forEach(el => { receiveMsg(el); });
};

const showContextMenu = (e, cid) => {
  e.preventDefault();
  const menu = document.getElementById('context-menu');
  menu.style.display = 'block';
  menu.style.top = e.clientY + "px";
  menu.style.left = e.clientX + "px";

  document.getElementById('leave-channel')
  .addEventListener('click', (e) => leaveChannel(e, cid))
};

const hideContextMenu = () => {
  const menu = document.getElementById('context-menu');
  menu.style.display = 'none';
};

const leaveChannel = (e, cid) => {
  const result = confirm("Do you really want to leave channel ?");
  if (! result) { return; }

  // TODO: Leave channel if user
  //       Delete if admin
  if (currentChannel === undefined)
  {
    return;
  }

  const channel = Object.entries(channels).find(id => parseInt(id[0]) === cid);

  if (channel === undefined)
  {
    return;
  }

  const requestObj = {
    headers: {'Content-Type': 'application/json'},
    method: "POST",
    body: JSON.stringify({"channel_id": cid}),
    mode: 'cors', 
    credentials: 'include', 
  };

  const path = channel[1].owner === uid ? "delete" : "leave";
  const url = `http://localhost:3000/channels/${path}`;
  fetch(url, requestObj)
  .then((res) => window.location.reload())
  .catch();
}

let last_el;
const populateChannelSelector = (channel_ids) => {
  const channel_selector = document.getElementById('channels');
  let first = true;
  channel_ids.forEach(element => {
    const el = document.createElement('button');
    el.innerText = element.id;
    el.addEventListener('click', () => {
      if (element.id !== currentChannel)
      {
        currentChannel = element.id;
        el.classList.add('selected');
        last_el.classList.remove('selected');
        last_el = el;
        getMessages(currentChannel);
        document.getElementById('message-input').focus();
      }
    });

    el.addEventListener('contextmenu', (e) => showContextMenu(e, element.id));
    
    if(first)
    {
      el.classList.add('selected');
      last_el = el;
      first = false;
    }
    
    channel_selector.querySelector('#show-channel-form').before(el)
  }); 
};

const close_btn = () => {
  const channel_selector = document.getElementById('channel-selector');
  const form = channel_selector.querySelector('#channel-form-overlay');
  form.style.display = 'none';
};

const createChannel_btn = () => {
  fetch('http://localhost:3000/channels/create', { method: 'POST' })
  .then(result => window.location.reload())
  .catch(err => err);
};

const addChannel_btn = () => {
  const channel_selector = document.getElementById('channel-selector');
  const form = channel_selector.querySelector('#channel-form-overlay');
  form.style.display = 'flex';

  document.getElementById('create-channel-btn')
  .addEventListener('click', createChannel_btn);
};

const getChannels = async () => {
  const result = await fetch("http://localhost:3000/channels/list",
    {
      method: 'GET', 
      mode: 'cors', 
      credentials: 'include'
    }
  )
  .then(res => res.json())
  // Return empty array by default
  .catch(() => []);

  channels.initialized_channels = [];

  if (result.length !== 0)
  {
    result.forEach(cid => {
      channels[`${cid.id}`] = {};
      channels[`${cid.id}`].messages = [];
      channels[`${cid.id}`].owner = cid.owner_id;
    });

    currentChannel = result[0].id;
    getMessages(currentChannel);
    populateChannelSelector(result);

    // Allowing to send data
    document.getElementById('message-input')
    .addEventListener('keypress', useEnter);

    //document.getElementById('message-input')
    //.addEventListener('submit', sendMsg);

    document.getElementById('message-container')
    .querySelector('button')
    .addEventListener('click', sendMsg);
  }
  else
  {
    document.getElementById('default-content').innerText = "It seems that you didn't join a channel... yet !";
  }
};
getChannels();

const connectWS = () => {
  console.log('Trying to connect')
  websocket = new WebSocket("ws:localhost:3000");

  websocket.onclose = (event) => {
    console.log("Connection closed");
    console.log(event);
    websocket.close();
  }

  websocket.onerror = (event) => {
    console.log("Connection error");
    console.log(event);
  }

  websocket.onmessage = (event) => {
    receiveMsg(JSON.parse(event.data));
    cacheMessage(event.data);
  }
};
connectWS();

document.getElementById('channel-selector')
.querySelector('button')
.addEventListener('click', addChannel_btn);

document.getElementById('channel-form')
.querySelector('button')
.addEventListener('click', close_btn);

document.addEventListener('click', hideContextMenu);

