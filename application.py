import os, time
from datetime import datetime

# join_room and leave_room allow for broadcasting info only to specific users
from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# list of all channels
channel_list = {'general': {'messages': [], 'users': []}}

# list of taken usernames
usernames = set()

@app.route("/")
def index():
    return render_template("index.html")

# check if a username is taken, returning False if so, or adding the username
# and returning True if it is not taken
@socketio.on("add_user")
def add_user(username):
    if username in usernames:
        return False
    else:
        usernames.add(username)
        return True

# send a list of channel names to the client
@socketio.on("get_channels")
def get_channels():
    # this syntax unwraps the channel_list keys as a list
    return [*channel_list]

# check if a channel name is taken, and if not create it and broadcast to all users
@socketio.on("add_channel")
def add_channel(channel):
    if channel in channel_list:
        return False
    else:
        channel_list[channel] = {'messages': [], 'users': []}
        emit('new_channel', channel, broadcast=True)
        return True

# join a channel
@socketio.on("join_channel")
def join_channel(data):
    ch = data['channel']
    # if the requested channel does not exist, join the general channel instead
    if ch in channel_list:
        channel = channel_list[ch]
    else:
        channel = channel_list['general']

    # check for errors in username creation and give user an arbitrary name
    username = data['username']
    if username is None:
        username = "NULL"

    # if username is not in set (eg if server was reset) add it now
    if username not in usernames:
        usernames.add(username)
    # have the user join the specified channel as a SocketIo room
    join_room(ch)

    # find the user in the specified channel, making it active or creating the user as necessary
    # generator expression will find all instances in list of dicts with the correct
    # key value pair
    user = next((u for u in channel['users'] if u['name'] == username), None)
    if user is not None:
        user['active'] = True
    else:
        user = {'name': username, 'active': True}
        channel['users'].append(user)
    # tell all users in the given room that a user has entered
    emit('user_changed', user, room=ch)

    res = {'name': ch, 'channel': channel}
    return res

# leave a channel
@socketio.on("leave")
def leave(data):
    channel = data['channel']
    username = data['username']
    # leave the associated SocketIo room
    leave_room(channel)

    # find the user in the channel info and set them to inactive
    user = next((u for u in channel_list[channel]['users'] if u['name'] == username), None)
    if user is None:
        return
    user['active'] = False
    # tell all users in the given room that the user has left
    emit('user_changed', user, room=channel)

# add a message to a channel
@socketio.on("add_message")
def add_message(data):
    # create a timestamp for the current time and format it as a string
    message = {
        'user': data['user'],
        'text': data['message'],
        'time': datetime.fromtimestamp(time.time()).strftime("%Y-%m-%d %I:%M %p")
    }

    # add the message to the channel info
    channel = data['channel']
    messages = channel_list[channel]['messages']
    messages.append(message)
    # only save 100 messages per channel
    if len(messages) > 100:
        messages = messages[-100:]

    # broadcast the new message to all users in the room
    emit('new_message', message, room=data['channel'])
