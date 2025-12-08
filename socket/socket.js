const User = require('../models/User');

const onlineUsers = new Map();

const socketHandler = () => {
    global.io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // User registers themselves as online
        socket.on('add-user', (userId) => {
            console.log(`User ${userId} is online.`);
            onlineUsers.set(userId, socket.id);
            User.findByIdAndUpdate(userId, { isOnline: true }, { new: true }).exec();
            
            // Broadcast to all clients that this user is now online
            global.io.emit('user-online', userId);
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
        // Note: Messages are also sent directly via the controller for immediate response.
        // This listener is for broadcasting to other clients in the chat room.
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
            for (let [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    disconnectedUserId = userId;
                    onlineUsers.delete(userId);
                    break;
                }
            }

            if (disconnectedUserId) {
                User.findByIdAndUpdate(disconnectedUserId, { isOnline: false }, { new: true }).exec();
                 // Broadcast to all clients that this user is now offline
                global.io.emit('user-offline', disconnectedUserId);
                console.log(`User ${disconnectedUserId} is offline.`);
            }
        });
    });
};

// Since we call this from server.js where io is already initialized,
// we can just export the function and call it.
socketHandler();

module.exports = socketHandler;
