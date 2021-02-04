/* eslint-disable no-restricted-globals */
const pagination = (req, res, next) => {
  let page = req.query.page ? +req.query.page : 0;
  if (page < 0 || isNaN(page)) page = 0;

  let size = req.query.size ? +req.query.size : 10;
  if (size < 0 || size > 10 || isNaN(size)) size = 10;

  req.pagination = { page, size };
  next();
};

module.exports = pagination;
