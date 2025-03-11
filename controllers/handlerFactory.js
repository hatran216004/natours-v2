const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { NOT_FOUND } = require('../utils/constants');

exports.deleteOne = (Modal) =>
  catchAsync(async (req, res, next) => {
    const doc = await Modal.findByIdAndDelete(req.params.id);
    if (!doc)
      return next(new AppError('No document found with that ID', NOT_FOUND));

    res.status(204).json({
      status: 'success',
      data: null
    });
  });

exports.updateOne = (Modal) =>
  catchAsync(async (req, res, next) => {
    const doc = await Modal.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // trả về doc mới sau khi update
      runValidators: true
    });

    if (!doc)
      return next(new AppError('No document found with that ID', NOT_FOUND));

    res.status(200).json({
      status: 'success',
      data: {
        doc
      }
    });
  });

exports.createOne = (Modal) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Modal.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        newDoc
      }
    });
  });
