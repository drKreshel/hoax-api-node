const crypto = require('crypto');

const randomString = (length) => crypto.randomBytes(length / 2).toString('hex');

module.exports = { randomString };
