const express = require('express');
const { check, validationResult } = require('express-validator');
const UserService = require('./UserService');

console.log(global);
const router = express.Router();

router.post(
  '/',
  check('username')
    .notEmpty()
    .withMessage('Username cannot be null')
    .bail() // if an error is found up to this point, it won't continue checking
    .isLength({ min: 4, max: 32 })
    .withMessage('Username field must have a minimum 4 and a maximum of 32 characters'), // check replaced the above validators
  check('email')
    .notEmpty()
    .withMessage('E-mail cannot be null')
    .bail()
    .isEmail()
    .withMessage('E-mail is not valid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findOneByEmail(email);
      if (user) {
        throw new Error('E-mail already in use');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('Password cannot be null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must have at least 6 characters')
    .bail()
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
    .withMessage('Password must have at least one uppercase, one lowercase letter and one number'),
  async (req, res) => {
    const errors = validationResult(req).errors;
    if (errors.length) {
      const validationErrors = {};
      errors.forEach((e) => (validationErrors[e.param] = e.msg));
      return res.status(400).send({ validationErrors });
    }
    try {
      await UserService.save(req.body);
      return res.status(200).send({ message: 'User created' });
    } catch (err) {
      return res.status(400).send(err);
    }
  }
);

module.exports = router;
