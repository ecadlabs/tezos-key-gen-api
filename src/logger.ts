const winston = require('winston');
const LEVEL = Symbol.for('level');

/**
 * Log only the messages the match `level`.
 */
function filterOnly(level: string) {
  return winston.format(function (info: any) {
    if (info[LEVEL] === level) {
      return info;
    }
  })();
}

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.colorize({ all: true }),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'debug.log',
      level: 'debug',
      format: filterOnly('debug'),
    }),
  ],
});
