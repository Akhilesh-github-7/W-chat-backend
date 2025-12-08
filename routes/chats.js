const express = require('express');
const router = express.Router();
const {
  accessChat,
  fetchChats,
  createGroupChat,
  sendMessage,
  getChatMessages,
  markMessageAsSeen,
  clearChat,
  deleteChat
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

const fileUpload = require('../middleware/fileUpload');
// All routes here are protected
router.use(protect);

router.route('/')
  .post(accessChat)
  .get(fetchChats);

router.route('/group').post(createGroupChat);
router.route('/message').post(fileUpload.single('file'), sendMessage);
router.route('/:chatId/messages').get(getChatMessages);
router.route('/message/seen').post(markMessageAsSeen);
router.route('/:chatId/clear').delete(clearChat);
router.route('/:chatId').delete(deleteChat);


module.exports = router;
