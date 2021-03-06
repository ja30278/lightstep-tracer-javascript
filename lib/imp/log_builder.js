'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _platform_abstraction_layer = require('../platform_abstraction_layer');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// eslint-disable-line camelcase
var constants = require('../constants');
var coerce = require('./coerce');

// Facade on the thrift log data structure to make constructing log records more
// convenient.

var LogBuilder = function () {
    function LogBuilder(runtime) {
        _classCallCheck(this, LogBuilder);

        this._runtime = runtime;
        this._record = new _platform_abstraction_layer.crouton_thrift.LogRecord({
            timestamp_micros: runtime._platform.nowMicros(),
            runtime_guid: null,
            span_guid: null,
            stable_name: null,
            message: null,
            level: null,
            thread_id: null,
            filename: null,
            line_number: null,
            stack_frames: null,
            payload_json: null,
            error_flag: null
        });
    }

    _createClass(LogBuilder, [{
        key: 'record',
        value: function record() {
            return this._record;
        }
    }, {
        key: 'end',
        value: function end() {
            this._runtime._addLogRecord(this._record);
        }
    }, {
        key: 'timestamp',
        value: function timestamp(micros) {
            this._record.timestamp_micros = coerce.toNumber(micros);
            return this;
        }
    }, {
        key: 'message',
        value: function message(msg) {
            this._record.message = coerce.toString(msg);
            return this;
        }
    }, {
        key: 'level',
        value: function level(num) {
            this._record.level = constants.LOG_LEVEL_TO_STRING[num] || null;
            if (num >= constants.LOG_ERROR) {
                this.error(true);
            }
            return this;
        }
    }, {
        key: 'span',
        value: function span(guid) {
            if (guid !== undefined) {
                this._record.span_guid = coerce.toString(guid);
            }
            return this;
        }
    }, {
        key: 'name',
        value: function name(stableName) {
            this._record.stable_name = coerce.toString(stableName);
            return this;
        }
    }, {
        key: 'error',
        value: function error(flag) {
            this._record.error_flag = coerce.toBoolean(flag);
            return this;
        }
    }, {
        key: 'payload',
        value: function payload(data) {
            if (data !== undefined) {
                this._record.payload_json = this._encodePayload(data);
            }
            return this;
        }
    }, {
        key: '_encodePayload',
        value: function _encodePayload(data) {
            var payloadJSON = null;
            try {
                payloadJSON = JSON.stringify(data);
            } catch (_ignored) {
                // TODO: this should log an internal warning that a payload could
                // not be encoded as JSON.
                return undefined;
            }
            return payloadJSON;
        }
    }]);

    return LogBuilder;
}();

module.exports = LogBuilder;

//# sourceMappingURL=log_builder.js.map