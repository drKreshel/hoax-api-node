module.exports = (err, req, res, next) => {
  const { status, message, errors } = err;
  let validationErrors;
  if (errors) {
    validationErrors = {};
    errors.forEach((e) => (validationErrors[e.param] = req.t(e.msg)));
  }
  return res.status(status).send({
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message: req.t(message),
    validationErrors,
  }); // see comment about validationError not showing below

  /*
Expressjs response.json() method uses JS JSON.stringify() method to convert object to a JSON string.

JSON.stringify() explicitly removes undefined values from objects whenever it is called as undefined is not a valid JSON value type.
*/
};
