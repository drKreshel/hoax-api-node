const app = require('./src/app');
const sequelize = require('./src/config/database');
const TokenService = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');

sequelize.sync();

TokenService.scheduledCleanup();

logger.error('error');
logger.warn('warn');
logger.info('info');
logger.verbose('verbose');
logger.debug('debug');
logger.silly('silly');

app.listen(3000, () =>
  logger.info(`SERVER RUNNING AT PORT 3000. Version: ${process.env.npm_package_version}`)
);

module.exports = app;
