module.exports = function ValidationException(message) {
  this.status = 401;
  this.message = message || 'authentication_failure';
  this.errors = '';
};
