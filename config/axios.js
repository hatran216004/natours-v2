const axios = require('axios');

module.exports = axios.create({
  baseURL: process.env.MOMO_ENDPOINT,
  timeout: 1000,
  headers: {
    'Content-Type': 'application/json'
  }
});
