const express = require('express');
const {
  broadcastNotification,
  createNotification,
  deleteNotification,
  deleteAllNotification,
  getUserNotifications,
  markAllAsRead,
  markAsRead
} = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware.authenticateJWT);

router.route('/').post(createNotification).get(getUserNotifications);

router.post('/broadcast', broadcastNotification);

router.patch('/mark-all-as-read', markAllAsRead);

router.route('/:id').patch(markAsRead).delete(deleteNotification);

router.delete('/delete-all', deleteAllNotification);

module.exports = router;
