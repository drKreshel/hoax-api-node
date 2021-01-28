const path = require('path');
const express = require('express');
const { uploadDir, profileDir } = require('config').directories;

// Internalization
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

// endpoints
const UserRouter = require('./user/UserRouter');
const AuthenticationRouter = require('./auth/AuthenticationRouter');
const HoaxRouter = require('./hoax/HoaxRouter');
const errorHandler = require('./error/errorHandler');

// middleware
const tokenAuthentication = require('./middleware/tokenAuthentication');

// other
const logger = require('./shared/logger');
const FileService = require('./file/FileService');

const profileImageFolder = path.join('.', uploadDir, profileDir);
const ONE_YEAR_IN_MILLISECONDS = 365 * 24 * 60 * 60 * 1000;

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

FileService.createFolders();
const app = express();

app.use(middleware.handle(i18next));
app.use(express.json({ limit: '3mb' }));

// maxAge sets cache so image doesn't need to be requested again if no changes happened
app.use('/images', express.static(profileImageFolder, { maxAge: ONE_YEAR_IN_MILLISECONDS }));

// instead of putting tokenAuthentication middleware on each route. Only verifies and updates token if authorization header is sent
app.use(tokenAuthentication);

// routes
app.use('/', UserRouter);
app.use('/', AuthenticationRouter);
app.use('/', HoaxRouter);

app.use(errorHandler);

logger.info('NODE_ENV: ', process.env.NODE_ENV);
module.exports = app;
