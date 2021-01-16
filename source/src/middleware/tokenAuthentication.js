const TokenService = require('../auth/TokenService');

const tokenAuthentication = async (req, res, next) => {
  const { authorization } = req.headers;
  // if http request has got header "authorization" then enters this block and set req.authenticateduser
  if (authorization) {
    const token = authorization.substring(7);
    console.log(token);
    try {
      const user = await TokenService.verify(token);
      req.authenticatedUser = user;
    } catch (err) {
      // catch an error here when token is null, sequelize will throw an error when a "where" parameter is sent null
      console.log('entra al catch de tokenAuthentication', err);
      // no need to pass anything here, code block will continue with next to put route and put route will handle the error
    }
    // if (user && !user.inactive) req.authenticatedUser = user;
    /** we don't need this anymore because token is proof that user is already logged in, and to be logged in you have to be active user, (see post login in authRouter) */
  }
  next();
};

module.exports = tokenAuthentication;
