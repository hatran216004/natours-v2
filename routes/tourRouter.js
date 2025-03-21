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

/**
 * distance - Bán kính tìm kiếm (km/miles)
 * latlng - Tọa độ trung tâm (latitude,longitude)
 * unit - Đơn vị khoảng cách ('km' hoặc 'mi')
 * các tour du lịch nằm trong khoảng cách nhất định từ một tọa độ trung tâm (latitude, longitude)
 * /tours-within/200/center/10.7769,106.7009/unit/km: các tour du lịch trong bán kính 200km tính từ tọa độ Hồ Chí Minh
 */
router.get(
  '/tours-within/:distance/center/:latlng/unit/:unit',
  tourController.getToursWithin
);

router.get(
  '/monthly-plan/:year',
  authMiddleware.authenticateJWT,
  authMiddleware.checkPermission('read_monthly_plan'),
  tourController.getMonthlyPlan
);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authMiddleware.authenticateJWT,
    authMiddleware.checkPermission('create_tour'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authMiddleware.authenticateJWT,
    authMiddleware.checkPermission('update_tour'),
    tourController.updateTour
  )
  .delete(
    authMiddleware.authenticateJWT,
    authMiddleware.checkPermission('delete_tour'),
    tourController.deleteTour
  );

// middleware chỉ chạy trên tourRouter khi có params
// router.param('id', (req, res, next, val) => {
//   checkID logic...
//   next();
// });

module.exports = router;
