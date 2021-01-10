const express = require('express');
const { check, validationResult } = require('express-validator');
const UserService = require('./UserService');

const router = express.Router();

router.get('/ping', (req, res) => {
  res.send('pong');
});

router.post(
  '/',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail() // if an error is found up to this point, it won't continue checking
    .isLength({ min: 4, max: 32 })
    .withMessage('username_size'), // check replaced the above validators
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
  async (req, res) => {
    const errors = validationResult(req).errors;
    if (errors.length) {
      const validationErrors = {};
      errors.forEach((e) => (validationErrors[e.param] = req.t(e.msg)));
      return res.status(400).send({ validationErrors });
    }
    try {
      await UserService.save(req.body);
      return res.status(200).send({ message: req.t('user_create_success') });
    } catch (err) {
      return res.status(err.status).send({ message: req.t(err.message), err });
    }
  }
);

module.exports = router;
