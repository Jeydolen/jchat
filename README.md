# JChat

## Video Demo:  <https://www.youtube.com/watch?v=v1J5ZqkznXY>

## Disclaimer: 

This project is being developped as a final project for CS50 online course.

It is not intended to be used commercially or personally even if I don't mind if you do.

An online live version might be accessible sometime but don't take my word for it.

You can still check my website [jeydolen.com](https://jeydolen.com) to see if it is available.

## Description:

JChat is a chat app providing a default server and client implementation of websockets.

It provides basic functionality like authentication, channel creation and message forwarding.

- ### Server side

  JChat is using a PostgreSQL database to store users, channels and every message sent in the app.

  SQL schema is available under /server/sql/db.sql

  The Web server is using [ExpressJS](https://www.npmjs.com/package/express) to handle most routes
  but basic authentication for upgrade request are directly done with http-server as there isn't any API for this in Express.

  There is basic authentication, channels and messages routing.

  The websocket http upgrade request has been modified to get only connected people on websocket server.

  Websocket server is enforcing all messages sent to be written in a json object including message content and channel id.

- ### Client side

  Client is written in HTML, CSS and Javascript.

  There is basic authentication pages and a mechanism to prevent non-logged person to access main app by redirecting them to 
  /login page.

  When user is connected, the app retrieve previous messages for selected channel and show them to user.
  App is retriving all joined channels for user and generate a navigation bar on left side of the app.
  When user click on any channel button, app loads all messages and cache them for further use.
  When user right click on channel button, a custom context-menu appear where he can invite someone or leave channel.
  If he clicks on leave channel app determine if he is leaving or deleting channel depending on if he is the owner or not.

  When user write a message and press Enter / click on Send, message is added to message list and sent to server to distribute to other people currently connected. 
  If a user registered in current channel isn't connected, he will receive the message next time he logs in.

## TODO
Rate limits

Permissions

Channel NAMES and permission modifier