const app = require('./src/app');
const sequelize = require('./src/config/database');
const TokenService = require('./src/auth/TokenService');
const FileService = require('./src/file/FileService');
const logger = require('./src/shared/logger');

sequelize.sync();

// scheduled tasks
TokenService.scheduledCleanup();
FileService.removeUnusedAttachments();

app.listen(process.env.PORT || 3000, () =>
  logger.info(`SERVER RUNNING AT PORT 3000. Version: ${process.env.npm_package_version}`)
);

module.exports = app;
