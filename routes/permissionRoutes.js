const express = require('express');
const permissionController = require('../controllers/permissionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware.authenticateJWT);
router.use(authMiddleware.restrictTo('admin'));

router.get('/all', permissionController.getAllForRole);

router
  .route('/')
  .get(permissionController.getAllPermissions)
  .post(permissionController.createPermission);

router
  .route('/:id')
  .delete(permissionController.deletePermission)
  .patch(permissionController.updatePermission);

module.exports = router;
