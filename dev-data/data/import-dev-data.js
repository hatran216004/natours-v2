const dotenv = require('dotenv');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const Tour = require('../../models/tourModel');

const app = express();

dotenv.config({ path: './config.env' });

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`));
// const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`));
// const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`));

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
    console.log('Data successfully loaded 😊');
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

const deleteData = async () => {
  try {
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
