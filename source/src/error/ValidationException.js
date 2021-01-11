module.exports = function ValidationException(errors) {
  this.status = 400;
  this.message = 'validation_failure';
  this.errors = errors;
};
