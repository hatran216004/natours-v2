const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const messageRouter = require('./messageRoutes');
const conversationController = require('../controllers/conversationController');

const router = express.Router();

router.use(authMiddleware.authenticateJWT);

router.use('/:conversationId/messages', messageRouter);

router.get('/', conversationController.getUserConversations);

router.route('/:id').delete(conversationController.deleteConversation);

module.exports = router;
