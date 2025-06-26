const Tour = require('../models/tourModel');

class TourService {
  async create(data) {
    return await Tour.create(data);
  }

  async search(key, page, limit) {
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

    return { tours, totalDocuments, totalPages };
  }

  async getStats() {
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
    return stats;
  }

  async getMonthlyPlan(year) {
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

    const totalToursPlan = plan.reduce(
      (acc, curr) => acc + curr.tours.length,
      0
    );

    return { totalToursPlan, plan };
  }

  async getToursWithin(unit, distance, lng, lat) {
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    const tours = await Tour.find({
      startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    return tours;
  }

  async getDistances(unit, lng, lat) {
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

    return distances;
  }
}

module.exports = new TourService();

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
