const dotenv = require('dotenv');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');
const Permission = require('../../models/permissionModel');
const Role = require('../../models/roleModel');

const app = express();

dotenv.config({ path: './config.env' });

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`));
const permissions = JSON.parse(
  fs.readFileSync(`${__dirname}/permissions.json`)
);
const roles = JSON.parse(fs.readFileSync(`${__dirname}/roles.json`));

console.log({ permissions, roles });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB).then(() => {
  console.log('Connected');
});

const importData = async () => {
  try {
    await Tour.create(tours);
    // await User.create(users, {
    //   validateBeforeSave: false
    // });
    // await Review.create(reviews);

    // // import roles & permissions
    // const permDocs = await Permission.create(permissions);
    // const savedPermissions = {};
    // permDocs.forEach((perm) => {
    //   savedPermissions[perm.name] = perm.id;
    // });

    // const roleDocs = roles.map(async (role) => {
    //   const permissionIds = role.permissions.map((p) => savedPermissions[p]);
    //   return await Role.create({
    //     name: role.name,
    //     permissions: permissionIds,
    //     description: role.description
    //   });
    // });
    // await Promise.all(roleDocs);

    console.log('Data successfully loaded 😊');
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

const deleteData = async () => {
  try {
    // await User.deleteMany();
    await Tour.deleteMany();
    console.log('Data deleted 😊');
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

console.log(process.argv);

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

app.listen(3000, () => {
  console.log('Server running');
});
