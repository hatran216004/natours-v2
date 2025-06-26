const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { BAD_REQUEST } = require('../utils/constants');
const { deleteOne, updateOne, getAll, getOne } = require('./handlerFactory');
const { upload } = require('../middleware/fileUploadMiddleware');
const imageService = require('../services/imageService');
const tourService = require('../services/tourService');

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  const { imageCover, images } = await imageService.resizeAndUploadTourPhoto(
    req.files?.imageCover,
    req.files?.images
  );
  req.body.imageCover = imageCover.display_name;
  req.body.images = images;

  next();
});

// ?limit=5&sort=-ratingsAverage,price: lọc ra 5 tour có ratingsAverage cao nhất, nếu bằng nhau thì ưu tiên tour có giá thấp hơn
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,difficulty,ratingsAverage,summary,imageCover';
  next();
};

exports.getAllTours = getAll(Tour);
exports.getTour = getOne(Tour, { path: 'reviews', select: '-__v' });
exports.updateTour = updateOne(Tour);
exports.deleteTour = deleteOne(Tour);

exports.createTour = catchAsync(async (req, res, next) => {
  req.body.startLocation = JSON.parse(req.body.startLocation);
  req.body.guides = JSON.parse(req.body.guides);
  req.body.startDates = JSON.parse(req.body.startDates);

  if (req.body.locations) req.body.locations = JSON.parse(req.body.locations);

  const tour = await tourService.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.searchTours = catchAsync(async (req, res, next) => {
  const { key } = req.params;
  const { page = 1, limit = 6 } = req.query;

  const { tours, totalDocuments, totalPages } = await tourService.search(
    key,
    page,
    limit
  );

  res.status(200).json({
    status: 'success',
    data: {
      tours
    },
    pagination: { total: totalDocuments, totalPages }
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await tourService.getStats();

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

// Đếm xem có bao nhiêu tours bắt đầu vào mỗi tháng của 1 năm nhất định: tháng 1 có 2 tour, tháng 2 có 5 tour,...
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year;
  const { totalToursPlan, plan } = await tourService.getMonthlyPlan(year);

  res.status(200).json({
    status: 'success',
    data: {
      totalToursPlan,
      plan
    }
  });
});

// '/tours-within/:distance/center/:latlng/unit/:unit'
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng)
    return next(
      new AppError('Please provide latitude longtitude', BAD_REQUEST)
    );

  const tours = await tourService.getToursWithin(unit, distance, lng, lat);

  res.status(200).json({
    status: 'success',
    result: tours.length,
    data: {
      tours
    }
  });
});

// Chỉ hoạt động nếu có 2dsphere index, Cần tạo index trên startLocation
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng)
    return next(
      new AppError('Please provide latitude longtitude', BAD_REQUEST)
    );

  const distances = await tourService.getDistances(unit, lng, lat);

  res.status(200).json({
    status: 'success',
    data: {
      tours: distances
    }
  });
});
