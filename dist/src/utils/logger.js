"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logging = void 0;
const expressWinston = require("express-winston");
const winston = require("winston");
const moment = require("moment");
const config_1 = require("./config");
const config = config_1.loadConfig();
const tsFormat = (ts) => moment(ts).format('YYYY-MM-DD HH:mm:ss').trim();
const logger = expressWinston.logger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.printf((info) => {
        return `-> ${tsFormat(info.timestamp)}: ${info.message}`;
    })),
    meta: false,
    // msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
    expressFormat: true,
    colorize: true,
    ignoreRoute: function (req, res) {
        if (req.path.startsWith('/json'))
            return true; // debugger
        return false;
    },
});
exports.default = logger;
const logging = {
    Express: config.logging && config.logging.includes('EXPRESS'),
    Lightning: config.logging && config.logging.includes('LIGHTNING'),
    Meme: config.logging && config.logging.includes('MEME'),
    Tribes: config.logging && config.logging.includes('TRIBES'),
    Notification: config.logging && config.logging.includes('NOTIFICATION'),
    Network: config.logging && config.logging.includes('NETWORK'),
    DB: config.logging && config.logging.includes('DB'),
    Proxy: config.logging && config.logging.includes('PROXY'),
    Lsat: config === null || config === void 0 ? void 0 : config.logging.includes('LSAT'),
};
exports.logging = logging;
//# sourceMappingURL=logger.js.map