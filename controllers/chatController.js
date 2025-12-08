const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const path = require('path');

// @desc    Create or access a one-to-one chat
// @route   POST /api/chats
// @access  Private
const accessChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'UserId param not sent with request' });
  }

  try {
    let isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password')
      .populate('latestMessage');

    isChat = await User.populate(isChat, {
      path: 'latestMessage.sender',
      select: 'name avatar email',
    });

    if (isChat.length > 0) {
      res.send(isChat[0]);
    } else {
      const chatData = {
        chatName: 'sender',
        isGroupChat: false,
        users: [req.user._id, userId],
      };

      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        'users',
        '-password'
      );
      res.status(200).json(FullChat);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Fetch all chats for a user
// @route   GET /api/chats
// @access  Private
const fetchChats = async (req, res) => {
  try {
    let chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    chats = await User.populate(chats, {
        path: 'latestMessage.sender',
        select: 'name avatar email',
    });

    res.status(200).send(chats);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a new group chat
// @route   POST /api/chats/group
// @access  Private
const createGroupChat = async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: "Please fill all the fields" });
    }

    let users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res.status(400).send("More than 2 users are required to form a group chat");
    }

    users.push(req.user);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Send a new message
// @route   POST /api/chats/message
// @access  Private
const sendMessage = async (req, res) => {
    const { content, chatId } = req.body;

    if (!chatId) {
        return res.status(400).json({ message: "Invalid data passed into request" });
    }

    if (!content && !req.file) {
        return res.status(400).json({ message: "Invalid data passed into request" });
    }

    const newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
    };

    if (req.file) {
        // Construct the relative path from the base uploads directory
        const relativePath = path.relative(path.join(__dirname, '../uploads'), req.file.path);
        newMessage.file = relativePath;
    }

    try {
        let message = await Message.create(newMessage);

        message = await message.populate('sender', 'name avatar');
        message = await message.populate('chat');
        message = await User.populate(message, {
            path: 'chat.users',
            select: 'name avatar email',
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        // Emit socket event for new message
        global.io.to(chatId).emit('msg-received', message);

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all messages for a chat
// @route   GET /api/chats/:chatId/messages
// @access  Private
const getChatMessages = async (req, res) => {
    const { chatId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    try {
        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'name avatar email')
            .populate('chat')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Message.countDocuments({ chat: chatId });

        res.json({
            messages,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Mark a message as seen
// @route   POST /api/chats/message/seen
// @access  Private
const markMessageAsSeen = async (req, res) => {
    const { messageId } = req.body;

    try {
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Add user to seenBy array if not already there
        if (!message.seenBy.includes(req.user._id)) {
            message.seenBy.push(req.user._id);
            await message.save();
        }

        // Emit socket event for message seen
        global.io.to(message.chat._id).emit('message-seen', {
            messageId: message._id,
            chatId: message.chat._id,
            userId: req.user._id,
        });

        res.status(200).json({ message: 'Message marked as seen' });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Clear all messages in a chat
// @route   DELETE /api/chats/:chatId/clear
// @access  Private
const clearChat = async (req, res) => {
    const { chatId } = req.params;
  
    try {
      const chat = await Chat.findById(chatId);
  
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
  
      // Check if the user is a member of the chat
      if (!chat.users.includes(req.user._id)) {
        return res.status(403).json({ message: 'You are not authorized to clear this chat' });
      }
  
      // Delete all messages in the chat
      await Message.deleteMany({ chat: chatId });
  
      // Update the latestMessage to null
      chat.latestMessage = null;
      await chat.save();
  
      res.status(200).json({ message: 'Chat cleared successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  };
  
  // @desc    Delete a chat
  // @route   DELETE /api/chats/:chatId
  // @access  Private
  const deleteChat = async (req, res) => {
    const { chatId } = req.params;
  
    try {
      const chat = await Chat.findById(chatId);
  
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
  
      // Check if the user is a member of the chat
      if (!chat.users.includes(req.user._id)) {
        return res.status(403).json({ message: 'You are not authorized to delete this chat' });
      }
  
      // Delete all messages in the chat
      await Message.deleteMany({ chat: chatId });
  
      // Delete the chat itself
      await Chat.findByIdAndDelete(chatId);
  
      res.status(200).json({ message: 'Chat deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  };


module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  sendMessage,
  getChatMessages,
  markMessageAsSeen,
  clearChat,
  deleteChat
};
