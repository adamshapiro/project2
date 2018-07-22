import os, time
from datetime import datetime

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

@socketio.on("add_user")
def add_user(username):
    if username in usernames:
        return False
    else:
        usernames.add(username)
        return True

@socketio.on("get_channels")
def get_channels():
    return [*channel_list]

@socketio.on("add_channel")
def add_channel(channel):
    if channel in channel_list:
        return False
    else:
        channel_list[channel] = {'messages': [], 'users': []}
        emit('new_channel', channel, broadcast=True)
        return True

@socketio.on("join_channel")
def join_channel(data):
    ch = data['channel']
    if ch in channel_list:
        channel = channel_list[ch]
    else:
        channel = channel_list['general']

    username = data['username']
    if username is None:
        username = "NULL"

    if username not in usernames:
        usernames.add(username)
    join_room(ch)

    user = next((u for u in channel['users'] if u['name'] == username), None)
    if user is not None:
        user['active'] = True
    else:
        user = {'name': username, 'active': True}
        channel['users'].append(user)
    emit('user_changed', user, room=ch)

    res = {'name': ch, 'channel': channel}
    return res

@socketio.on("leave")
def leave(data):
    channel = data['channel']
    username = data['username']
    leave_room(channel)

    user = next(u for u in channel_list[channel]['users'] if u['name'] == username, None)
    if user is None:
        return
    user['active'] = False
    emit('user_changed', user, room=channel)

@socketio.on("add_message")
def add_message(data):
    message = {
        'user': data['user'],
        'text': data['message'],
        'time': datetime.fromtimestamp(time.time()).strftime("%Y-%m-%d %I:%M %p")
    }

    channel = data['channel']
    messages = channel_list[channel]['messages']
    messages.append(message)
    if len(messages) > 100:
        messages = messages[-100:]

    emit('new_message', message, room=data['channel'])
