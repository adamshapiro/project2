### Web Programming with Python and JavaScript

This website allows visitors, after choosing a unique username, to join and create
different chat rooms, and post messages to any rooms that are sent in real time to other users.
The following files are used:

### HTML
---
* [index.html](/templates/index.html): The only HTML page of this single-page application.
    This page contains:
    + a sidebar with links to all channels and a button for creating a new channel.
    + a display of every message saved in the channel and a form for sending a new message
    + lists for both active and inactive users in the channel
    + modals for choosing a username and adding a channel

### CSS
---
* This project uses Bootstrap almost entirely for styling elements and does not have
    its own CSS file. The only manual styling used is for the message view's scrolling,
    which is done through the style attribute

### JavaScript
---
* [index.js](/static/index.js): Responsible for adding and updating DOM elements as it
    receives information regarding channels via the websocket, and emitting new information
    to the server from the client (such as new channels or messages, or the client changing
    channels)

### Python
---
* [application.py](/application.py): The main file for running the flask server. Used for
    updating the list of channels as well as the messages and users for each channel,
    and broadcasting changes in real time via a SocketIO websocket.

### MISC
---
* [requirements.txt](/requirements.txt): A list of python modules that must be installed before
    running the application.

### Notes
---
* The personal touch in this project is the addition of the 'Users' view, which
displays all the users who have entered the channel at least once. The view is
split into two lists:
    - Active users are currently viewing the open channel in their own client.
    - Inactive users are viewing a different channel or are not on the site at all.
