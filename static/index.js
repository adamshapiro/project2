document.addEventListener('DOMContentLoaded', () => {
    const socket = io.connect(`${location.protocol}//${document.domain}:${location.port}`);

    socket.on('connect', () => {
        if (!localStorage.getItem('username')) {
            document.getElementById('userModalSubmit').onclick = () => {
                const username = document.getElementById('userModalInput').value;
                socket.emit('add_user', username, success => {
                    if (success) {
                        localStorage.setItem(username);
                        $('#userModal').modal('hide');
                    } else {
                        document.getElementById('userModalAlert').classList.remove('d-none');
                    }
                });
            };
            $('#userModal').modal('show');
        }

        socket.emit('get_channels', null, channels => {
            channels.forEach(channel => addChannel(channel));

            if (!localStorage.getItem('channel'))
                localStorage.setItem('channel', 'general')

            joinChannel(localStorage.getItem('channel'));
        });

        document.getElementById('addMessageSend').onclick = () => {
            const message = document.getElementById('addMessageInput').value;

            var data = {
                'user': localStorage.getItem('username'),
                'message': message,
                'channel': localStorage.getItem('channel')
            };

            socket.emit('add_message', data);
        };

        document.getElementById('channelModalSubmit').onclick = function() {
            const add_modal = document.getElementById("channelModalInput");
            const channel_name = add_modal.value;
            socket.emit('add_channel', channel_name, success => {
                if (success) {
                    add_modal.value = '';
                    document.getElementById('channelModalAlert').classList.add('d-none');
                    document.getElementById('addChannel').click();
                    joinChannel(channel_name);
                }
                else {
                    document.getElementById('channelModalAlert').classList.remove('d-none');
                }
            });
        };
    });
});

function addChannel (name) {
    const add = document.getElementById('addChannel');
    const button = document.createElement('button');
        button.innerHTML = name;
        button.className = 'nav-link';
        button.id = name;
        button.onclick = joinChannel(name);

    add.parentNode.insertBefore(button, add);
}

function joinChannel (channel) {
    socket.emit('join_channel', channel, messages => {
        messages.forEach(message => addMessage(message));
    });
    localStorage.setItem('channel', channel);

    const old = document.querySelector('nav .active');
    if (old) {
        old.classList.remove('active');
        socket.emit('leave', old.innerHTML);
    }

    document.getElementById(channel).classList.add('active');
}

function addMessage (m) {
    const name = document.createElement('span');
        name.className = 'float-left font-weight-bold border-right';
        name.innerHTML = m.user;

    const text = document.createElement('span');
        text.innerHTML = m.text;

    const time = document.createElement('span');
        time.className = 'float-right font-italic border-left';
        time.innerHTML = m.time;

    const message = document.createElement('li');
        message.className = 'mr-auto bg-light border border-dark';
        message.appendChild(name);
        message.appendChild(text);
        message.appendChild(time);

    document.getElementById('chatBox').appendChild(message);
}
