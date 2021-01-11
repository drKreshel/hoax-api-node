const express = require('express');
const { check, body, validationResult } = require('express-validator');
const UserService = require('./UserService');
const ValidationException = require('../error/ValidationException');

const router = express.Router();

router.get('/ping', (req, res) => {
  res.send('pong');
});

/// POST api/1.0/users
router.post(
  '/',
  check('username', 'username_size') // can also be passed here
    .notEmpty()
    .withMessage('username_null')
    .bail() // if an error is found up to this point, it won't continue checking
    .isLength({ min: 4, max: 32 }),
  // .withMessage('username_size'), // check replaced the above validators
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findOneByEmail(email);
      if (user) {
        throw new Error('email_in_use');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
    .withMessage('password_pattern'),
  async (req, res, next) => {
    const errors = validationResult(req).errors;
    if (errors.length) {
      return next(new ValidationException(errors));
      // return res.status(400).send({ validationErrors });
    }
    try {
      await UserService.save(req.body);
      return res.status(200).send({ message: req.t('user_create_success') });
    } catch (err) {
      return next(err);
    }
  }
);

// POST api/1.0/users/token/:token
router.post('/token/:token', async (req, res, next) => {
  const { token } = req.params;
  try {
    await UserService.activateAccount(token);
    return res.status(200).send({ message: req.t('account_activation_success') });
  } catch (err) {
    return next(err); // sin el return continua la ejecución
  }
});
module.exports = router;
