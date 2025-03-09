const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router(); // tạo ra 1 middleware router(userRouter)

// User
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);
router.patch(
  '/update-my-password/',
  authMiddleware.authenticateJWT,
  authController.updatePassword
);

router.patch('/refresh-token', authController.refreshToken);

router.patch(
  '/update-me',
  authMiddleware.authenticateJWT,
  userController.updateMe
);
router.delete(
  '/delete-me',
  authMiddleware.authenticateJWT,
  userController.deleteMe
);

// Quản trị viên
router
  .route('/')
  .get(
    authMiddleware.authenticateJWT,
    authMiddleware.restrictTo('admin'),
    userController.getAllUsers
  )
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
