'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var LOG_INFO = exports.LOG_INFO = 0;
var LOG_WARN = exports.LOG_WARN = 1;
var LOG_ERROR = exports.LOG_ERROR = 2;
var LOG_FATAL = exports.LOG_FATAL = 3;

var LOG_LEVEL_TO_STRING = exports.LOG_LEVEL_TO_STRING = {
    LOG_INFO: 'I',
    LOG_WARN: 'W',
    LOG_ERROR: 'E',
    LOG_FATAL: 'F'
};
var LOG_STRING_TO_LEVEL = exports.LOG_STRING_TO_LEVEL = {
    I: LOG_INFO,
    W: LOG_WARN,
    E: LOG_ERROR,
    F: LOG_FATAL
};

// The report interval for empty reports used to sample the clock skew
var CLOCK_STATE_REFRESH_INTERVAL_MS = exports.CLOCK_STATE_REFRESH_INTERVAL_MS = 350;

var LIGHTSTEP_APP_URL_PREFIX = exports.LIGHTSTEP_APP_URL_PREFIX = 'https://app.lightstep.com';

var JOIN_ID_PREFIX = exports.JOIN_ID_PREFIX = 'join:';

//# sourceMappingURL=constants.js.map