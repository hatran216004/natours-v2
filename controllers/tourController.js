const Tour = require('../models/tourModel');
const ApiFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { NOT_FOUND } = require('../utils/constants');

// ?limit=5&sort=-ratingsAverage,price: lọc ra 5 tour có ratingsAverage cao nhất, nếu bằng nhau thì ưu tiên tour có giá thấp hơn
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,difficulty,ratingsAverage,summary,imageCover';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  const features = new ApiFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // Excute
  const tours = await features.query;

  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime,
    data: {
      result: tours.length,
      tours
    }
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);
  if (!tour) {
    return next(new AppError('No document found with that ID', NOT_FOUND));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.createTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.create(req.body);

  res.status(201).json({
    status: 'created success',
    data: {
      tour
    }
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const tour = await Tour.findByIdAndUpdate(id, req.body, {
    new: true, // trả về doc mới sau khi update
    runValidators: true
  });

  if (!tour)
    return next(new AppError('No document found with that ID', NOT_FOUND));

  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const tour = await Tour.findByIdAndDelete(id);

  if (!tour)
    return next(new AppError('No document found with that ID', NOT_FOUND));

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.searchTours = catchAsync(async (req, res, next) => {
  const { key } = req.params;
  const { page = 1, limit = 3 } = req.query;

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

  const tours = await Tour.find(filter).skip(skip).limit(parseInt(limit, 10));

  res.status(200).json({
    status: 'success',
    data: {
      result: tours.length,
      tours
    }
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
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
    }
    // {
    //   $match: { _id: { $ne: 'easy' } }
    // }
    // {
    //   $project: {
    //     _id: 0
    //   }
    // }
  ]);

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
