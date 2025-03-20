const express = require('express');
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware.authenticateJWT);
router.use(authMiddleware.restrictTo('admin'));

router.post('/:roleId/permissions', roleController.assignPermissionToRole);
router.delete(
  '/:roleId/permissions/:permissionId',
  roleController.removePermissionFromRole
);

router
  .route('/')
  .get(roleController.getAllRoles)
  .post(roleController.createRole);
router.delete('/:id', roleController.deleteRole);

module.exports = router;
