const { createLogger, transports, format } = require('winston');

const customFormat = format.combine(
  format.timestamp({
    format: 'DD-MM-YYYY - HH:mm:ss',
  }),
  format.printf((info) => {
    return `${info.timestamp}  [${info.level.toUpperCase().padEnd(7)}] : ${info.message}`;
  })
);

const destinations = [new transports.Console()];
if (process.env.NODE_ENV === 'production') {
  destinations.push(new transports.File({ filename: 'app.log', level: 'debug' }));
}

const logger = createLogger({
  transports: destinations,
  level: 'debug', // default level of tranports, overriden by level passed directly to each tranport options object
  format: customFormat, // default format of transports, can also be overriden
  silent: process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'staging',
});

module.exports = logger;
