const sharp = require('sharp');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { BAD_REQUEST } = require('../utils/constants');
const { deleteOne, updateOne, getAll, getOne } = require('./handlerFactory');
const { upload } = require('../middleware/fileUploadMiddleware');

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (req.files?.imageCover) {
    // 1. imageCover
    req.body.imageCover = req.params.id
      ? `tour-${req.params.id}-${Date.now()}-cover.jpeg`
      : `tour-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${req.body.imageCover}`);
  }

  if (req.files?.images) {
    // 2. images
    req.body.images = await Promise.all(
      req.files.images.map(async (file, index) => {
        const filename = req.params.id
          ? `tour-${req.params.id}-${Date.now()}-${index + 1}.jpeg`
          : `tour-${Date.now()}-${index + 1}.jpeg`;
        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/tours/${filename}`);

        return filename;
      })
    );
  }

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
  req.body.locations = JSON.parse(req.body.locations);
  const doc = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour: doc
    }
  });
});

exports.searchTours = catchAsync(async (req, res, next) => {
  const { key } = req.params;
  const { page = 1, limit = 6 } = req.query;

  // Điều kiện tìm kiếm
  const filter = {
    $or: [
      { name: { $regex: key, $options: 'i' } }, // $options: 'i': không phân biệt chữ hoa chữ thường
      { description: { $regex: key, $options: 'i' } },
      { summary: { $regex: key, $options: 'i' } }
      // { location: { $regex: key, $options: 'i' } }
    ]
  };
  const skip = (page - 1) * parseInt(limit, 10);

  const [tours, totalDocuments] = await Promise.all([
    Tour.find(filter).skip(skip).limit(parseInt(limit, 10)),
    Tour.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalDocuments / limit);

  res.status(200).json({
    status: 'success',
    data: {
      tours
    },
    pagination: { total: totalDocuments, totalPages }
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  let stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    },
    {
      $addFields: {
        difficulty: '$_id'
      }
    },
    {
      $project: {
        _id: 0
      }
    }
    // {
    //   $match: { _id: { $ne: 'easy' } }
    // }
  ]);

  stats = stats.map((stat) => ({
    ...stat,
    avgRating: Math.round((stat.avgRating * 10) / 10),
    avgPrice: Math.round((stat.avgPrice * 10) / 10)
  }));

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

// Đếm xem có bao nhiêu tours bắt đầu vào mỗi tháng của 1 năm nhất định: tháng 1 có 2 tour, tháng 2 có 5 tour,...
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates' // tách từng phần tử trong mảng, mỗi doc sẽ gắn tương ứng với 1 phần tử
    },
    {
      // lọc các doc nằm trong 1/1 - 31/12
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      // Nhóm các doc có cùng tháng lại với nhau
      $group: {
        _id: { $month: '$startDates' },
        tours: {
          $push: { name: '$name', price: '$price', startDates: '$startDates' }
        }, // Mảng chứa các tour
        numTourStarts: { $sum: 1 }
      }
    },
    {
      $addFields: {
        month: '$_id'
      }
    },
    {
      $sort: {
        month: 1
        // numTourStarts: -1
      }
    },
    {
      $project: {
        _id: 0
      }
    }
  ]);

  const totalToursPlan = plan.reduce((acc, curr) => acc + curr.tours.length, 0);

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

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

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

  const multiplier = unit === 'mi' ? 0.00062137 : 0.001;

  // $geoNear: phải luôn là stage đầu tiên
  const distances = await Tour.aggregate([
    // stage giúp tìm các docs gần một vị trí cụ thể
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $sort: {
        distance: 1
      }
    },
    {
      $project: {
        name: 1,
        distance: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      tours: distances
    }
  });
});

// Tìm các tour có maxGroupSize > 10
// exports.getTopRatings();

/*
  Khi gọi Tour.find(queryObj), nó thực hiện các bước:
  1. Tạo một đối tượng truy vấn (Query Object).
  2. Chưa thực thi truy vấn ngay (nó là một Query object, không phải một Promise).
  3. Kế thừa Query.prototype để có thể chain các phương thức như .select(), .sort(), .limit().
  4. Thực thi truy vấn bằng await hoặc .exec().

*/

/*
  Cấu trúc tổng quát của Aggregation
  Có thể lặp lại pipline trong aggregate
  Model.aggregate([
  { $match: { điều kiện lọc } },  
  { $group: { tổng hợp dữ liệu } },  
  { $sort: { sắp xếp kết quả } },  
  { $project: { chọn các trường muốn lấy } }  
]);

Toán tử	        Chức năng
$match	    Lọc dữ liệu (giống find()) *
$group	    Gom nhóm dữ liệu, tính toán tổng hợp *
$sort	      Sắp xếp dữ liệu *
$project	  Chọn/trả về các trường mong muốn *
$limit	    Giới hạn số lượng kết quả *
$skip	      Bỏ qua một số kết quả *

$lookup	    JOIN bảng (tương tự populate)
$unwind	    Tách mảng thành từng phần tử
$addFields	Thêm hoặc chỉnh sửa trường
*/

/*
1. Thống kê số lượt đặt tour theo từng khách hàng
2. Thống kê tổng doanh thu theo từng tour
3. Lấy danh sách các tour được đặt nhiều nhất
4. Tính tổng doanh thu theo tháng
5. Tìm khách hàng chưa từng đặt tour
6. Tính trung bình số người tham gia mỗi tour
7. Tìm tour có nhiều bình luận nhất
8. Danh sách khách hàng vip
*/
