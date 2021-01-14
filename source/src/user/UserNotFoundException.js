module.exports = function InvalidTokenException() {
  this.message = 'user_not_found';
  this.status = 404;
};
