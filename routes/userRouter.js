const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router(); // tạo ra 1 middleware router(userRouter)

// User
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.patch('/refresh-token', authController.refreshToken);

router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// -- Protect all routes after this middleware
router.use(authMiddleware.authenticateJWT);

router.post('/logout', authController.logout);
router.patch('/update-my-password/', authController.updatePassword);
router.get('/me', userController.getMe);
router.patch(
  '/update-me',
  userController.checkBodyPassword,
  userController.updateMe
);
router.delete(
  '/delete-me',
  authMiddleware.checkPermission('delete_me'),
  userController.deleteMe
);

// Quản trị viên
router.use(authMiddleware.checkPermission('manage_users'));

router.route('/').get(userController.getAllUsers);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.checkBodyPassword, userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
