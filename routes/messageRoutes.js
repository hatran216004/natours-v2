const express = require('express');
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware.authenticateJWT);

router.get('/', messageController.getAllMessages);

module.exports = router;
