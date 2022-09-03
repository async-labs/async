import * as winston from 'winston';

const dev = process.env.NODE_ENV !== 'production';

// info
// debug
// error
// https://github.com/winstonjs/winston#logging-levels

const logger = winston.createLogger({
  level: dev ? 'debug' : 'info', // 'debug' will not print in production
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'MM/DD HH:mm',
    }),
    winston.format.printf((info) => {
      // supports two arguments
      let meta;
      const symbols: symbol[] = Object.getOwnPropertySymbols(info);
      if (symbols.length === 2) {
        const secondSymbol = symbols[1];
        meta = JSON.stringify(info[secondSymbol as any][0]);
      }
      return (
        `${info.timestamp} ${[info.level.toUpperCase()]}: ${info.message}` +
        (meta ? `, ${meta}` : '')
      );
    }),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
