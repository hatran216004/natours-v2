const sharp = require('sharp');
const { uploadToCloudinary } = require('../utils/helpers');

class ImageService {
  async resizeAndUploadUserPhoto(fileBuffer, fieldName) {
    const byteArrayBuffer = await sharp(fileBuffer)
      .resize(500, 500)
      .toFormat('jpg')
      .jpeg({ quality: 90 })
      .toBuffer();

    const result = await uploadToCloudinary(
      byteArrayBuffer,
      fieldName,
      'users'
    );

    return result;
  }

  async resizeAndUploadTourPhoto(imageCover, images) {
    const data = {};
    if (imageCover) {
      const filename = imageCover[0].fieldname;
      const byteArrayBuffer = await sharp(imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpg')
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await uploadToCloudinary(
        byteArrayBuffer,
        filename,
        'tours'
      );
      data.imageCover = result;
    }

    if (images) {
      data.images = await Promise.all(
        images.map(async (file) => {
          const byteArrayBuffer = await sharp(file.buffer)
            .resize(2000, 1333)
            .toFormat('jpg')
            .jpeg({ quality: 90 })
            .toBuffer();
          const result = await uploadToCloudinary(
            byteArrayBuffer,
            file.fieldname,
            'tours'
          );
          const filename = result.public_id.replace('tours/', '');
          return filename;
        })
      );
    }

    return data;
  }
}

module.exports = new ImageService();
