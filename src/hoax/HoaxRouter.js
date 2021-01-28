const express = require('express');
const { check, validationResult } = require('express-validator');
const HoaxService = require('./HoaxService');
const pagination = require('../middleware/pagination');

const router = express.Router();
const AuthenticationException = require('../auth/AuthenticationException');
const ValidationException = require('../error/ValidationException');

router.post(
  '/api/1.0/hoaxes',
  check('content').isLength({ min: 10, max: 5000 }).withMessage('hoax_content_size'),
  async (req, res, next) => {
    // authentication control
    if (!req.authenticatedUser) {
      return next(new AuthenticationException('unauthorized_hoax_submit'));
    }

    // validation control
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }

    await HoaxService.save(req.body, req.authenticatedUser.id);
    return res.status(200).send({ message: req.t('hoax_submit_success') });
  }
);

router.get(['/api/1.0/hoaxes', '/api/1.0/users/:userId/hoaxes'], pagination, async (req, res, next) => {
  let query;
  if (req.query) {
    query = req.query;
  }
  const { page, size } = req.pagination;

  try {
    const hoaxes = await HoaxService.getHoaxes({ userId: req.params.userId, page, size, query });
    res.status(200).send(hoaxes);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
