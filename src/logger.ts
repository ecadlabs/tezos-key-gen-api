const winston = require('winston');

export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({ timestamp: true }),
  ]
});
