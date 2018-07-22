var socket = io.connect(`${location.protocol}//${document.domain}:${location.port}`);

// once the document has loaded, configure buttons
document.addEventListener('DOMContentLoaded', () => {

    socket.on('connect', () => {
        // If a client has not come to the site before, have them pick a unique username
        if (!localStorage.getItem('username')) {
            document.getElementById('userModalSubmit').onclick = () => {
                const username = document.getElementById('userModalInput').value;
                // add the username to the server
                socket.emit('add_user', username, success => {
                    if (success) {
                        localStorage.setItem('username', username);
                        $('#userModal').modal('hide');
                        // dont load (and join) any channels until the user has a name
                        getChannels();
                    } else {
                        // if it is already in use, show an error and maintain the modal
                        document.getElementById('userModalAlert').classList.remove('d-none');
                    }
                });
            };
            // Bootstrap modals require JQuery
            // Prevent the modal from being closed by clicking the backdrop or pressing 'esc'
            $('#userModal').modal({
                backdrop: 'static',
                keyboard: false
            });
        } else {
            getChannels();
        }

        // message submission sends username, body of message, and which channel to server
        document.getElementById('addMessage').onsubmit = () => {
            const message = document.getElementById('addMessageInput');

            var data = {
                'user': localStorage.getItem('username'),
                'message': message.value,
                'channel': localStorage.getItem('channel')
            };

            socket.emit('add_message', data);
            message.value = '';
            // return false to prevent page reload
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
                    // join the newly created channel
                    joinChannel(channel_name);
                }
                else {
                    // adding a new channel should fail if the channel name is in use
                    document.getElementById('channelModalAlert').classList.remove('d-none');
                }
            });
        };
    }); // end of socket.on('connect')

    // dynamically change the view when a user enters or leaves the channel
    socket.on('user_changed', user => {
        addUser(user);
    });
    // dynamically change the view when a new channel or message is added to the server
    socket.on('new_message', message => addMessage(message));
    socket.on('new_channel', channel => addChannel(channel));
}); // end of document.addEventListener

// leave the current channel when leaving the page
window.addEventListener('unload', () => {
    socket.emit('leave', {
        'username': localStorage.getItem('username'),
        'channel': localStorage.getItem('channel')
    });
});

// get a list of channel names from the server
function getChannels () {
    socket.emit('get_channels', channels => {
        channels.forEach(channel => addChannel(channel));

        // if the user does not have a saved channel (eg first time visiting) set it to general
        if (!localStorage.getItem('channel') || localStorage.getItem('channel') == 'undefined')
            localStorage.setItem('channel', 'general');

        // have the client join their last channel
        joinChannel(localStorage.getItem('channel'));
    });
}

// Add a button for a channel to the sidebar
function addChannel (name) {
    const add = document.getElementById('addChannel');
    const button = document.createElement('button');
        button.innerHTML = name;
        button.className = 'nav-link btn btn-dark my-1';
        button.id = name;
        // wrap the onclick in an anonymous function to prevent joinChannel running when onclick is set
        button.onclick = () => { joinChannel(name) };

    // add the new channel directly before the channel adding button
    add.parentNode.insertBefore(button, add);
}

// get all the information for a channel and populate content
function joinChannel (channel) {
    var user = localStorage.getItem('username');

    // clear message box and users lists of old channel's info
    document.getElementById('chatBox').innerHTML = '';
    document.querySelectorAll('#userBox ul').forEach(ul => ul.innerHTML = '');

    socket.emit('join_channel', {'username': user, 'channel': channel}, res => {
        name = res['name']
        req = res['channel']
        req['users'].forEach(user => addUser(user));
        req['messages'].forEach(message => addMessage(message));
        // use the returned channel name in case requested channel does not exist
        // (may occur if server was reset and localStorage was not updated)
        localStorage.setItem('channel', name);
        document.getElementById('channelName').innerHTML = name;

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

// add a message element to the view, consisting of author, body, and timestamp
function addMessage (m) {
    const chatBox = document.getElementById('chatBox');
    // determine if the message view is scrolled all the way down
    const chatScrolled = (chatBox.scrollTop + chatBox.offsetHeight == chatBox.scrollHeight);

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

    // if the message view had been scrolled to the bottom, keep it at the bottom
    if (chatScrolled)
        chatBox.scrollTop = chatBox.scrollHeight;
}

// add a user to the channel's user sidebar
function addUser (user) {
    // check for errors in the user info and prevent DOM update if issue found
    if (user['name'] == null || user['active'] == null)
        return

    // if there is already a li for the user, remove it to prevent duplicates
    var old = document.getElementById(`user-${user['name']}`);
    if (old != null)
        old.parentNode.removeChild(old);

    // create a li element for the user
    var li = document.createElement('li');
        li.innerHTML = user['name'];
        li.className = 'list-group-item';
        li.id = `user-${user['name']}`

    // add the li element to the correct ul and style correctly based on active status
    if (user['active']) {
        li.classList.add('text-danger');
        document.getElementById('activeUsers').appendChild(li);
    } else {
        li.classList.add('disabled');
        document.getElementById('inactiveUsers').appendChild(li);
    }
}
