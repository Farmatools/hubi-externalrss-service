const winston = require('winston');
const fs = require('fs');
const path = require('path');
const logDir = 'logs'; // directory path you want to set

if (!fs.existsSync(logDir)) {
    // Create the directory if it does not exist
    fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    },
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => {
            return `${info.timestamp} ${info.level}: ${info.message}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                winston.format.colorize(),
                winston.format.printf(info => {
                    return `${info.timestamp} ${info.level}: ${info.message}`;
                })
            )
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'app-info.log'),
            level: 'info'
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'app-error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'app-debug.log'),
            level: 'debug'
        })
    ]
});

module.exports = logger;