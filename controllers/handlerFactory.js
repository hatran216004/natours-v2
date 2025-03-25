const Review = require('../models/reviewModel');
const ApiFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { filterObj } = require('../utils/helpers');
const { NOT_FOUND, PAGE_LIMIT } = require('../utils/constants');

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // Lọc đối với nested route review
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    if (req.originalUrl.endsWith('/bookings/me'))
      filter = { user: req.user.id };

    const features = new ApiFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // Excute
    const [docs, totalDocuments] = await Promise.all([
      features.query,
      Model.countDocuments(filter)
    ]);

    const modelName = Model.modelName.toLowerCase();

    let totalPages = Math.ceil(
      totalDocuments / (parseInt(req.query.limit, 10) || PAGE_LIMIT)
    );

    res.status(200).json({
      status: 'success',
      data: {
        [modelName]: docs
      },
      pagination: { total: totalDocuments, totalPages }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    let query = Model.findById(id);

    const modelName = Model.modelName.toLowerCase();

    if (popOptions) {
      const docs = await query;
      const features = new ApiFeatures(Review.find({ tour: id }), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
      const reviews = await features.query;

      // Tính tổng số reviews để hỗ trợ phân trang
      const totalReviews = await Review.countDocuments({ tour: id });
      const totalPages = Math.ceil(
        totalReviews / parseInt(req.query.limit, 10) || PAGE_LIMIT
      );
      docs.reviews = reviews;

      return res.status(200).json({
        status: 'success',
        pagination: {
          total: totalReviews,
          totalPages
        },
        data: {
          [modelName]: docs
        }
      });
    }

    const doc = await query;
    if (!doc)
      return next(new AppError('No document found with that ID', NOT_FOUND));

    res.status(200).json({
      status: 'success',
      data: {
        [modelName]: doc
      }
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc)
      return next(new AppError('No document found with that ID', NOT_FOUND));

    res.status(204).json({
      status: 'success',
      data: null
    });
  });

exports.updateOne = (Model, filterOpts) =>
  catchAsync(async (req, res, next) => {
    let filteredBody = { ...req.body };
    if (filterOpts) filteredBody = filterObj(req.body, ...filterOpts);

    const doc = await Model.findById(req.params.id);

    if (!doc)
      return next(new AppError('No document found with that ID', NOT_FOUND));

    Object.keys(filteredBody).forEach((key) => {
      doc[key] = filteredBody[key];
    });
    const updatedDoc = await doc.save();

    const modelName = Model.modelName.toLowerCase();

    res.status(200).json({
      status: 'success',
      data: {
        [modelName]: updatedDoc
      }
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    if (req.body.startLocation)
      req.body.startLocation = JSON.parse(req.body.startLocation);

    if (req.body.locations) {
      req.body.locations = JSON.parse(req.body.locations);
    }

    const doc = await Model.create(req.body);
    const modelName = Model.modelName.toLowerCase();

    res.status(201).json({
      status: 'success',
      data: {
        [modelName]: doc
      }
    });
  });
