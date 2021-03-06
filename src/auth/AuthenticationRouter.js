const express = require('express');
const bcrypt = require('bcrypt');
const UserService = require('../user/UserService');
const TokenService = require('./TokenService');
const AuthenticationException = require('./AuthenticationException');
const ForbiddenException = require('../error/ForbiddenException');
const loginValidation = require('../middleware/loginValidation');
const tokenAuthentication = require('../middleware/tokenAuthentication');

const router = express.Router();

router.post('/api/1.0/auth', loginValidation, async (req, res, next) => {
  const { email, password } = req.body;
  const user = await UserService.getUserByEmail(email);
  if (!user) return next(new AuthenticationException()); // 401

  const match = await bcrypt.compare(password, user.password); // password, hashedPassword
  if (!match) return next(new AuthenticationException()); // 401

  if (user.inactive) return next(new ForbiddenException()); // 403
  const token = await TokenService.createToken({ id: user.id });

  return res.status(200).send({ id: user.id, username: user.username, image: user.image, token });
});

router.post('/api/1.0/logout/:id', tokenAuthentication, async (req, res, next) => {
  // if no auth header is sent, then 204 ok no content is sent. (debatable, le pregunté a Ale y así lo hace)
  if (!req.headers.authorization) {
    return res.status(204).send();
  }
  if (!req.authenticatedUser || req.authenticatedUser.id != req.params.id) {
    return next(new ForbiddenException(req.t('unauthorized_user_logout')));
  }
  const token = req.headers.authorization.substring(7);
  await TokenService.deleteToken(token);
  return res.status(204).send();
});

module.exports = router;
