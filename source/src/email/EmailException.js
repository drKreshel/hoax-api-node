module.exports = function EmailException() {
  this.message = 'email_failure';
  this.status = 502;
};

//* Variant: ES6 classes
// module.exports = class EmailException {
//   message = 'email_failure';
//   status = 502;
// };
