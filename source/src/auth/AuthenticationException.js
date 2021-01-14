module.exports = function ValidationException() {
  this.status = 401;
  this.message = 'authentication_failure';
  this.errors = '';

};
