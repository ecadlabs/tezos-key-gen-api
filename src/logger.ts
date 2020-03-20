const winston = require('winston');

export const loggerOptions = {
  transports: [
    new winston.transports.Console({ level: 'debug', timestamp: true }),
  ]
};

export const logger = winston.createLogger(loggerOptions);
