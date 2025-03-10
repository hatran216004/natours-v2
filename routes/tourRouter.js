const express = require('express');
const tourController = require('../controllers/tourController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router(); // tạo ra 1 middleware router(tourRouter)

// Điền trước query params vào url
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);
// --
router.route('/search/:key').get(tourController.searchTours);
router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(
    authMiddleware.authenticateJWT,
    authMiddleware.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

// middleware chỉ chạy trên tourRouter khi có params
// router.param('id', (req, res, next, val) => {
//   checkID logic...
//   next();
// });

module.exports = router;
