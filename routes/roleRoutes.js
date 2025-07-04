const express = require('express');
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware.authenticateJWT);
router.use(authMiddleware.restrictTo('admin'));

router
  .route('/:roleId/permissions/:permissionId')
  .post(roleController.assignPermissionToRole)
  .delete(roleController.removePermissionFromRole);

router
  .route('/')
  .get(roleController.getAllRoles)
  .post(roleController.createRole);
router
  .route('/:id')
  .delete(roleController.deleteRole)
  .patch(roleController.updateRole);

module.exports = router;
