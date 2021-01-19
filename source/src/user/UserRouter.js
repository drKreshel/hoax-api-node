const express = require('express');
const { check, validationResult } = require('express-validator');
const UserService = require('./UserService');
const pagination = require('../middleware/pagination');
const registrationValidation = require('../middleware/registrationValidation');
const ForbiddenException = require('../error/ForbiddenException');
const ValidationException = require('../error/ValidationException');

// const tokenAuthentication = require('../middleware/tokenAuthentication');
// TODO: maybe put back tokenAuthentication on each route that really needs it, instead of putting as global middleware.
// Ale: es más importante podes en cualquier momento cambiar solo en un lugar el middleware y que el resto de la aplicacion siga funcionando sin enterarse

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
// From express documentation: If you pass anything to the next() function (except the string 'route'), Express regards the current request as being an error and will skip any remaining non-error handling routing and middleware functions.

// POST api/1.0/users/token/:token
router.post('/api/1.0/users/token/:token', async (req, res, next) => {
  const { token } = req.params;
  try {
    await UserService.activateAccount(token);
    return res.status(200).send({ message: req.t('account_activation_success') });
  } catch (err) {
    return next(err); // sin el return continua la ejecución
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
// if the function is async you need to pass the error via "next(new UserNotFoundException())". Otherwise you can just call "throw new UserNotFoundException()"
router.put('/api/1.0/users/:id', async (req, res, next) => {
  // si la autenticación falló o si se está intentado modificar otro usuario ==> 403 forbidden
  if (!req.authenticatedUser || req.authenticatedUser.id != req.params.id) {
    return next(new ForbiddenException('unauthorized_user_update'));
  }
  await UserService.updateUser(req.params.id, req.body);
  /** Variant: another way to do the update, but is better to have it on a different service.
    Object.assign(user, req.body);
    await user.save(); */
  return res.status(200).send('User data modified successfully'); // todo: internalization
});

router.delete('/api/1.0/users/:id', async (req, res, next) => {
  if (!req.authenticatedUser || req.authenticatedUser.id != req.params.id) {
    return next(new ForbiddenException('unauthorized_user_delete'));
  }
  await UserService.deleteUser(req.params.id);
  return res.status(200).send();
});

//! user en singular
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

//! ESTA EN SINGULAR ESTE USER, por eso no golpea en el anterior put
router.put(
  '/api/1.0/user/password',

  // looks for user with that passwordResetToken in the database to check if it exists
  async (req, res, next) => {
    const user = await UserService.findUserByToken(req.body.passwordResetToken)
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
