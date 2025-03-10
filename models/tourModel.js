const mongoose = require('mongoose');
const slugify = require('slugify');

// Khi tạo mới 1 document mongoose sẽ bỏ qua những field không được định nghĩa trong schema
const Schema = mongoose.Schema;
const tourSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      minlength: [
        10,
        'A tour name must have more or equals than 10 charactors'
      ],
      maxlength: [40, 'A tour name must have less or equals than 40 charactors']
    },
    slug: String,
    secretTour: {
      type: Boolean,
      default: false
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a max group size']
    },
    difficulty: {
      type: String,
      requiredd: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficult is either: easy, medium, difficulty'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'A rating must be above 1.0'],
      max: [5, 'A rating must be below 5.0'],
      set: (value) => Math.round(value * 10) / 10 // 4.666667 * 10 => 46.66667 => 47 / 10 = 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    priceDiscount: {
      type: Number,
      validate: {
        // this chỉ trỏ đến current document khi tạo mới document
        validator: function (value) {
          return value < this.price && value > 0;
        },
        message: 'Discount price {VALUE} should be below regular price and > 0'
      }
    },
    summary: {
      type: String,
      required: [true, 'A tour must have a summary'],
      trim: true,
      maxlength: [1000, 'A summary must be below 1000 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'A summary must be below 1000 characters']
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a image cover']
    },
    images: [String],
    startDates: [Date],
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false // không trả về khi query
    }
  },
  {
    toJSON: { virtuals: true }, // Khi trả về json sẽ kèm theo virtual properties
    toObject: { virtuals: true }
  }
);

// VIRTUAL PROPERTIES
// * Không thể dùng thuộc tính ảo để truy vấn (vì nó không được lưu trong db)
tourSchema.virtual('durationWeeks').get(function () {
  return Math.ceil(this.duration / 7);
});

// VIRTUAL POPULATE: không muốn lưu trực tiếp _id của doc liên quan trong db, nhưng vẫn muốn lấy dữ liệu từ bảng khác.
tourSchema.virtual('reviews', {
  ref: 'Review', // Tên model tham chiếu
  localField: '_id', // Khóa chính của Tour
  foreignField: 'tour' // Trường trong ReviewSchema tham chiếu đến Tour
});

// DOCUMENT MIDDLEWARE
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromses = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromses);
//   next();
// });

// Chạy sau khi doc đã được lưu vào db
// doc: document sau khi lưu vào db
// tourSchema.post('save', function (doc, next) {
//   console.log(doc.slug);
//   next();
// });

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.startQuery = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: 'name email photo role'
  });
  next();
});

tourSchema.post(/^find/, function (documents, next) {
  // console.log(`This query took ${Date.now() - this.startQuery} milliseconds`);
  next();
});

// AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function (next) {
  // Thêm stage match vào đầu pipeline()
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});

const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;

/*
- .save() chỉ chạy khi một document được tạo mới hoặc cập nhật trực tiếp bằng phương thức .save()
Có 4 loại middleware trong mongoose: document, query, aggregate, model middleware
- Document middleware: Chỉ chạy trên .save() và .create()  (this là document đang được xử lý)
- Query middleware: chạy trước hoặc sau khi 1 query được thực thi (this là 1 query object)
- Aggregate middleware: chạy trước hoặc sau khi 1 Aggregate xảy ra (this là 1 aggregation object)
- Dùng virtual populate thay vì child referencing (lưu mảng reviews trên tour) vì tránh tạo ra mảng vô hạn
*/
