const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../user/User');
const UserService = require('../user/UserService');
const AuthenticationException = require('./AuthenticationException');
const ForbiddenException = require('../error/ForbiddenException');
const loginValidation = require('../middleware/loginValidation');

const router = express.Router();

router.post('/api/1.0/auth', loginValidation, async (req, res, next) => {
  const { email, password } = req.body;

  const user = await UserService.getUserByEmail(email);
  if (!user) return next(new AuthenticationException()); // 401

  const match = await bcrypt.compare(password, user.password); // password, hashedPassword
  if (!match) return next(new AuthenticationException()); // 401

  if (user.inactive) return next(new ForbiddenException()); // 403

  return res.status(200).send({ id: user.id, username: user.username });
});

module.exports = router;
