const express = require('express');
const UserService = require('./UserService');

const router = express.Router();

/* ----------  api/1.0/users ---------- */

router.post('/', async (req, res) => {
  const user = req.body;
  if (user.username === null) {
    return res.status(400).send({ validationErrors: { username: 'Username cannot be null' } });
  }
  await UserService.save(req.body);
  return res.status(200).send({ message: 'User created' });
});

module.exports = router;
