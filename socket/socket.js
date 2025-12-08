const User = require('../models/User');

const onlineUsers = new Map();

const socketHandler = () => {
    global.io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // User registers themselves as online
        socket.on('add-user', (userId) => {
            if (!onlineUsers.has(userId)) {
                // This is the user's first connection.
                console.log(`User ${userId} is online for the first time.`);
                onlineUsers.set(userId, new Set());
                User.findByIdAndUpdate(userId, { isOnline: true }, { new: true }).exec();
                // Broadcast to all other clients that this user is now online
                socket.broadcast.emit('user-online', userId);
            }
            // Add the new socket to the user's set of connections
            onlineUsers.get(userId).add(socket.id);

            console.log(`User ${userId} has a new connection. Total connections: ${onlineUsers.get(userId).size}`);

            // Send the current list of all online users back to this specific client
            socket.emit('get-online-users', Array.from(onlineUsers.keys()));
        });

        // Join a chat room
        socket.on('join-chat', (chatId) => {
            socket.join(chatId);
            console.log(`User ${socket.id} joined chat: ${chatId}`);
        });

        // Typing indicator events
        socket.on('typing', (room) => socket.in(room).emit('typing'));
        socket.on('stop-typing', (room) => socket.in(room).emit('stop-typing'));

        // Listen for a new message
        socket.on('send-msg', (data) => {
            const { chatId } = data;
            if (chatId) {
                socket.to(chatId).emit('msg-received', data);
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            let disconnectedUserId = null;
            // Find which user this socket belonged to
            for (let [userId, socketIds] of onlineUsers.entries()) {
                if (socketIds.has(socket.id)) {
                    disconnectedUserId = userId;
                    // Remove the disconnected socket from the user's set
                    socketIds.delete(socket.id);
                    console.log(`User ${userId} lost a connection. Remaining connections: ${socketIds.size}`);
                    // If the user has no more active connections, mark them as offline
                    if (socketIds.size === 0) {
                        onlineUsers.delete(userId);
                        User.findByIdAndUpdate(userId, { isOnline: false }, { new: true }).exec();
                        // Broadcast to all clients that this user is now offline
                        global.io.emit('user-offline', userId);
                        console.log(`User ${userId} is now fully offline.`);
                    }
                    break;
                }
            }
        });
    });
};

// Since we call this from server.js where io is already initialized,
// we can just export the function and call it.
socketHandler();

module.exports = socketHandler;
