let previousMsg;
const receiveMsg = (element) => {
  console.log(element);
  const message = element.content;
  const messages = document.getElementById('messages');
  if (document.getElementById('default-content') !== null)
  {
    messages.removeChild(document.getElementById('default-content'));
  }

  // If user that sent the message is the same as previously then put in the same block
  if (element.source_id !== undefined && previousMsg === element.source_id)
  {
    const node_arr = document.getElementsByClassName('message');
    const msgDiv = node_arr[node_arr.length - 1];
    msgDiv.innerText += "\n" + message;
  }
  else
  {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.innerText = message;
    messages.appendChild(msgDiv);
  }

  previousMsg = element.source_id;
  messages.scrollTop = messages.scrollHeight;
}

let websocket;
connectWS = () => {
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
    console.log(event);
    receiveMsg(event.data);
  }
};
connectWS();


const sendMsg = () => {
  const message = document.getElementById('message-input');
  console.log(message, message.value)
  receiveMsg(message);
  if (websocket !== undefined && message.value !== "")
  {
    websocket.send(JSON.stringify({"channel": 1, "message": message.value}));
  }
  message.value = "";
};

const useEnter = (evt) => {
  if (evt.key == "Enter")
  {
    sendMsg();
    return;
  }
}

const getMessages = async (cid) => {
  const result = await fetch("http://localhost:3000/messages/list?channel_id=" + cid,
    {method: 'GET', mode: 'cors', credentials: 'include'}
  ).then(res => res.json())
  // Return empty array by default
  .catch(() => []);
  
  console.log(result);
  result.forEach(element => {
    receiveMsg(element);
  });
  return;
};

const getChannels = async () => {
  const result = await fetch("http://localhost:3000/channels/list",
  {method: 'GET', mode: 'cors', credentials: 'include'}
  ).then(res => res.json())
  // Return empty array by default
  .catch(() => []);

  console.log(result);
  if (result.length !== 0)
  {
    result.forEach(cid => {
      getMessages(cid);
    })

    document.getElementById('message-input')
    .addEventListener('keypress', useEnter);

    document.getElementById('message-input')
    .addEventListener('submit', sendMsg);

    document.querySelector('button[type=submit]')
    .addEventListener('click', sendMsg);
  }
  else
  {
    document.getElementById('default-content').innerText = "It seems that you didn't join a channel... yet !";
  }
};

getChannels();