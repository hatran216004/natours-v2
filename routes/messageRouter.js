const express = require('express');
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware.authenticateJWT);

router.get('/conversations', messageController.getUserConversations);
router.get('/:otherUserId', messageController.getAllMessages);
router.post('/', messageController.sendMessage);

module.exports = router;
