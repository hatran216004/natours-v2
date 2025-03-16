const express = require('express');
const tourController = require('../controllers/tourController');
const authMiddleware = require('../middleware/authMiddleware');
const reviewRouter = require('./reviewRouter');

const router = express.Router(); // tạo ra 1 middleware router(tourRouter)
// Moute router con (reviewRouter) vào router cha tourRouter
router.use('/:tourId/reviews', reviewRouter);

// Điền trước query params vào url
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);
// --
router.get('/search/:key', tourController.searchTours);
router.get('/tour-stats', tourController.getTourStats);
router.get(
  '/monthly-plan/:year',
  authMiddleware.authenticateJWT,
  authMiddleware.restrictTo('admin', 'lead-guide', 'guide'),
  tourController.getMonthlyPlan
);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authMiddleware.authenticateJWT,
    authMiddleware.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authMiddleware.authenticateJWT,
    authMiddleware.restrictTo('admin', 'lead-guide'),
    tourController.updateTour
  )
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
