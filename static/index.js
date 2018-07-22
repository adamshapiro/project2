var socket = io.connect(`${location.protocol}//${document.domain}:${location.port}`);

document.addEventListener('DOMContentLoaded', () => {

    socket.on('connect', () => {
        if (!localStorage.getItem('username')) {
            document.getElementById('userModalSubmit').onclick = () => {
                const username = document.getElementById('userModalInput').value;
                socket.emit('add_user', username, success => {
                    if (success) {
                        localStorage.setItem('username', username);
                        $('#userModal').modal('hide');
                    } else {
                        document.getElementById('userModalAlert').classList.remove('d-none');
                    }
                });
            };
            $('#userModal').modal({
                backdrop: 'static',
                keyboard: false
            });
        }

        socket.emit('get_channels', channels => {
            channels.forEach(channel => addChannel(channel));

            if (!localStorage.getItem('channel') || localStorage.getItem('channel') == 'undefined')
                localStorage.setItem('channel', 'general');

            joinChannel(localStorage.getItem('channel'));
        });

        document.getElementById('addMessage').onsubmit = () => {
            const message = document.getElementById('addMessageInput');

            var data = {
                'user': localStorage.getItem('username'),
                'message': message.value,
                'channel': localStorage.getItem('channel')
            };

            socket.emit('add_message', data);
            message.value = '';
            return false;
        };

        document.getElementById('channelModalSubmit').onclick = function() {
            const add_modal = document.getElementById("channelModalInput");
            const channel_name = add_modal.value;
            socket.emit('add_channel', channel_name, success => {
                if (success) {
                    add_modal.value = '';
                    document.getElementById('channelModalAlert').classList.add('d-none');
                    $('#channelModal').modal('hide');
                    joinChannel(channel_name);
                }
                else {
                    document.getElementById('channelModalAlert').classList.remove('d-none');
                }
            });
        };
    }); // end of socket.on('connect')

    socket.on('user_changed', user => {
        addUser(user);
    });

    socket.on('new_message', message => addMessage(message));

    socket.on('new_channel', channel => addChannel(channel));
}); // end of document.addEventListener

window.addEventListener('beforeunload', () => {
    socket.emit('leave', {
        'username': localStorage.getItem('username'),
        'channel': localStorage.getItem('channel')
    });
});

function addChannel (name) {
    const add = document.getElementById('addChannel');
    const button = document.createElement('button');
        button.innerHTML = name;
        button.className = 'nav-link btn btn-dark my-1';
        button.id = name;

    add.parentNode.insertBefore(button, add);
    button.onclick = () => { joinChannel(name) };
}

function joinChannel (channel) {
    var user = localStorage.getItem('username');

    document.getElementById('chatBox').innerHTML = '';
    document.querySelectorAll('#userBox ul').forEach(ul => ul.innerHTML = '');

    socket.emit('join_channel', {'username': user, 'channel': channel}, res => {
        name = res['name']
        req = res['channel']
        req['users'].forEach(user => addUser(user));
        req['messages'].forEach(message => addMessage(message));
        localStorage.setItem('channel', name);
        document.getElementById('channelName').innerHTML = name;
        const chatBox = document.getElementById('chatBox');
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    const old = document.querySelector('nav .btn-info');
    if (old) {
        old.classList.replace('btn-info', 'btn-dark');
        old.classList.remove('border', 'border-danger');
        socket.emit('leave', {'username': user, 'channel': old.innerHTML});
    }

    document.getElementById(channel).classList.replace('btn-dark', 'btn-info');
    document.getElementById(channel).classList.add('border', 'border-danger');
}

function addMessage (m) {
    const name = document.createElement('span');
        name.className = 'float-left font-weight-bold border-right border-dark px-2';
        name.innerHTML = m.user;

    const text = document.createElement('span');
        text.innerHTML = m.text;
        text.className = 'px-2'

    const time = document.createElement('span');
        time.className = 'float-right font-italic border-left border-dark px-2';
        time.innerHTML = m.time;

    const message = document.createElement('li');
        message.className = 'bg-light border-dark list-group-item';
        message.appendChild(name);
        message.appendChild(text);
        message.appendChild(time);

    document.getElementById('chatBox').appendChild(message);
}

function addUser (user) {
    if (user['name'] == null || user['active'] == null)
        return

    var old = document.getElementById(`user-${user['name']}`);
    if (old != null)
        old.parentNode.removeChild(old);

    var li = document.createElement('li');
        li.innerHTML = user['name'];
        li.className = 'list-group-item';
        li.id = `user-${user['name']}`

    if (user['active']) {
        li.classList.add('text-danger');
        document.getElementById('activeUsers').appendChild(li);
    } else {
        li.classList.add('disabled');
        document.getElementById('inactiveUsers').appendChild(li);
    }
}
