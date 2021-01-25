const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationException');

module.exports = [
  check('password').notEmpty().withMessage('password_null'),
  check('email').notEmpty().withMessage('email_null').bail().isEmail().withMessage('email_invalid'),
  async (req, res, next) => {
    const errors = validationResult(req).errors;
    if (errors.length) {
      return next(new ValidationException(errors));
    }
    next();
  },
];
