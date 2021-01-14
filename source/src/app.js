const express = require('express');
// Internalization
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
// Routers
const UserRouter = require('./user/UserRouter');
const AuthenticationRouter = require('./auth/AuthenticationRouter')
const errorHandler = require('./error/errorHandler');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language', // must be lowercase
    },
  });

const app = express();

app.use(middleware.handle(i18next));
app.use(express.json());

app.use('/api/1.0/users', UserRouter);
app.use('/', AuthenticationRouter);

app.use(errorHandler);

console.log('NODE_ENV: ', process.env.NODE_ENV);
module.exports = app;
