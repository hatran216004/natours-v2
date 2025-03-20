const express = require('express');
const permissionController = require('../controllers/permissionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware.authenticateJWT);
router.use(authMiddleware.restrictTo('admin'));

router
  .route('/')
  .get(permissionController.getAllPermissions)
  .post(permissionController.createPermission);

router.delete('/:id', permissionController.deletePermission);

module.exports = router;
