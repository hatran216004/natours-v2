const catchAsync = require('../utils/catchAsync');

exports.createNotification = catchAsync(async (req, res, next) => {});

exports.getUserNotifications = catchAsync(async (req, res, next) => {});

exports.deleteNotification = catchAsync(async (req, res, next) => {});

exports.deleteAllNotification = catchAsync(async (req, res, next) => {});

exports.markAsRead = catchAsync(async (req, res, next) => {});

exports.markAllAsRead = catchAsync(async (req, res, next) => {});

exports.broadcastNotification = catchAsync(async (req, res, next) => {});
