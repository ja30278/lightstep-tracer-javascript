'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var constants = require('../constants');

var LogToConsole = function () {
    function LogToConsole() {
        _classCallCheck(this, LogToConsole);

        this._enabled = false;
        this._tracer = null;
        this._optionsCb = this._handleOptions.bind(this);
        this._logAddedCb = this._handleLogAdded.bind(this);
    }

    _createClass(LogToConsole, [{
        key: 'name',
        value: function name() {
            return 'log_to_console';
        }
    }, {
        key: 'addOptions',
        value: function addOptions(tracerImp) {
            tracerImp.addOption('log_to_console', {
                type: 'bool',
                defaultValue: false
            });
            tracerImp.on('options', this._optionsCb);
        }
    }, {
        key: 'start',
        value: function start(tracer, tracerImp) {
            this._tracer = tracer;
        }
    }, {
        key: 'stop',
        value: function stop() {
            this._tracer.removeListener('options', this._optionsCb);
        }
    }, {
        key: '_handleOptions',
        value: function _handleOptions(modified, current, tracerImp) {
            var enabled = current.log_to_console;
            if (this._enabled === enabled) {
                return;
            }
            this._enabled = enabled;
            if (this._enabled) {
                tracerImp.on('log_added', this._logAddedCb);
            } else {
                tracerImp.removeListener('log_added', this._logAddedCb);
            }
        }
    }, {
        key: '_handleLogAdded',
        value: function _handleLogAdded(record) {
            var level = constants.LOG_STRING_TO_LEVEL[record.level];
            var message = record.message;

            // Ignore records without a message (e.g. a stable_name log record)
            if (!message) {
                return;
            }

            var payload = record.payload_json;
            if (payload) {
                try {
                    payload = JSON.parse(payload);
                } catch (_ignored) {/* ignored */}
            }

            switch (level) {
                case constants.LOG_ERROR:
                case constants.LOG_FATAL:
                    if (payload !== undefined) {
                        console.error(message, payload); // eslint-disable-line no-console
                    } else {
                        console.error(message); // eslint-disable-line no-console
                    }
                    break;
                case constants.LOG_WARN:
                    if (payload !== undefined) {
                        console.warn(message, payload); // eslint-disable-line no-console
                    } else {
                        console.warn(message); // eslint-disable-line no-console
                    }
                    break;
                case constants.LOG_INFO:
                default:
                    if (payload !== undefined) {
                        console.log(message, payload); // eslint-disable-line no-console
                    } else {
                        console.log(message); // eslint-disable-line no-console
                    }
                    break;
            }
        }
    }]);

    return LogToConsole;
}();

module.exports = new LogToConsole();

//# sourceMappingURL=log_to_console.js.map