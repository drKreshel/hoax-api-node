const { check, validationResult } = require('express-validator');
const UserService = require('../user/UserService');
const ValidationException = require('../error/ValidationException');

module.exports = [
  check('username', 'username_size') // can also be passed here
    .notEmpty()
    .withMessage('username_null')
    .bail() // if an error is found up to this point, it won't continue checking
    .isLength({ min: 4, max: 32 }),

  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
    .withMessage('password_pattern'),

  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.getUserByEmail(email);
      if (user) {
        throw new Error('email_in_use');
      }
    }),

  async (req, res, next) => {
    const errors = validationResult(req).errors;
    if (errors.length) {
      return next(new ValidationException(errors));
    }
    next();
  },
];

// exports.validateUser = [
//   check('name')
//     .trim()
//     .escape()
//     .not()
//     .isEmpty()
//     .withMessage('User name can not be empty!')
//     .bail()
//     .isLength({min: 3})
//     .withMessage('Minimum 3 characters required!')
//     .bail(),
//   check('email')
//     .trim()
//     .normalizeEmail()
//     .not()
//     .isEmpty()
//     .withMessage('Invalid email address!')
//     .bail(),
//   (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty())
//       return res.status(422).json({errors: errors.array()});
//     next();
//   },
// ];
