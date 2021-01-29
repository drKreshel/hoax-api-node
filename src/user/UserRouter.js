const express = require('express');
const { check, validationResult } = require('express-validator');
const UserService = require('./UserService');
const pagination = require('../middleware/pagination');
const registrationValidation = require('../middleware/registrationValidation');
const ForbiddenException = require('../error/ForbiddenException');
const ValidationException = require('../error/ValidationException');
const FileService = require('../file/FileService');

const router = express.Router();

/// POST api/1.0/users
//* Registration form
router.post('/api/1.0/users', registrationValidation, async (req, res, next) => {
  try {
    await UserService.postUser(req.body);
    return res.status(200).send({ message: req.t('user_create_success') });
  } catch (err) {
    return next(err);
  }
});

// POST api/1.0/users/token/:token
router.post('/api/1.0/users/token/:token', async (req, res, next) => {
  const { token } = req.params;
  try {
    await UserService.activateAccount(token);
    return res.status(200).send({ message: req.t('account_activation_success') });
  } catch (err) {
    return next(err);
  }
});

router.get('/api/1.0/users', pagination, async (req, res) => {
  const { authenticatedUser } = req;
  const { page, size } = req.pagination;
  const users = await UserService.getUsers({ page, size, authenticatedUser });
  res.status(200).send(users);
});

router.get('/api/1.0/users/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await UserService.getUser(id);
    return res.status(200).send(user);
  } catch (err) {
    return next(err);
  }
});

router.put(
  '/api/1.0/users/:id',
  check('username', 'username_size')
    .notEmpty()
    .withMessage('username_null')
    .bail() // if an error is found up to this point, it won't continue checking username and go straight to check password
    .isLength({ min: 4, max: 32 }),
  check('image').custom(async (imageAsBase64String) => {
    // exit -image size validation- if no image is sent in the request
    if (!imageAsBase64String) return true;

    // return error if image is higher than 2MB
    const buffer = Buffer.from(imageAsBase64String, 'base64');
    if (FileService.isBiggerThan2MB(buffer)) {
      throw new Error('image_size_limit_exceeded');
    }

    // return error if file type is unsupported
    if (!(await FileService.isSupportedFileType(buffer))) {
      throw new Error('unsupported_image_file');
    }

    return true;
  }),
  async (req, res, next) => {
    // authentication controls
    if (!req.authenticatedUser || req.authenticatedUser.id != req.params.id) {
      return next(new ForbiddenException('unauthorized_user_update'));
    }

    // validation controls
    const errors = validationResult(req).errors;

    if (errors.length) {
      return next(new ValidationException(errors));
    }

    const updatedUser = await UserService.updateUser(req.params.id, req.body);
    return res.status(200).send(updatedUser);
  }
);

router.delete('/api/1.0/users/:id', async (req, res, next) => {
  console.log('DELETE ROUTE');
  if (!req.authenticatedUser || req.authenticatedUser.id != req.params.id) {
    return next(new ForbiddenException('unauthorized_user_delete'));
  }
  await UserService.deleteUser(req.params.id);
  return res.status(200).send();
});

//! user singular
router.post(
  '/api/1.0/user/password',
  check('email').isEmail().withMessage('email_invalid'),
  async (req, res, next) => {
    const errors = validationResult(req).errors;
    if (errors.length) {
      return next(new ValidationException(errors));
    }
    try {
      await UserService.passwordReset(req.body.email);
      return res.status(200).send({ message: req.t('password_reset_success') });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/api/1.0/user/password',

  // looks for user with that passwordResetToken in the database to check if it exists
  async (req, res, next) => {
    const user = await UserService.findUserByToken(req.body.passwordResetToken);
    if (!user) {
      return next(new ForbiddenException('unauthorized_password_reset'));
    }
    next();
  },

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
      // return res.status(400).send();
      return next(new ValidationException(errors));
    }
    await UserService.updatePassword(req.body);
    res.status(200).send();
  }
);

module.exports = router;
