'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // eslint-disable-line camelcase


var _platform_abstraction_layer = require('../platform_abstraction_layer');

var _each2 = require('../_each');

var _each3 = _interopRequireDefault(_each2);

var _coerce = require('./coerce');

var coerce = _interopRequireWildcard(_coerce);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// eslint-disable-line camelcase
var proto = require('./generated_proto/collector_pb.js');
var googleProtobufTimestampPB = require('google-protobuf/google/protobuf/timestamp_pb.js');

var LogRecordImp = function () {
    function LogRecordImp(logFieldKeyHardLimit, logFieldValueHardLimit, timestampMicros, fields) {
        _classCallCheck(this, LogRecordImp);

        this._logFieldKeyHardLimit = logFieldKeyHardLimit;
        this._logFieldValueHardLimit = logFieldValueHardLimit;
        this._timestampMicros = timestampMicros;
        this._fields = fields;
        this._keysOverLimit = 0;
        this._valuesOverLimit = 0;
    }

    _createClass(LogRecordImp, [{
        key: '_clearOverLimits',
        value: function _clearOverLimits() {
            this._keysOverLimit = 0;
            this._valuesOverLimit = 0;
        }
    }, {
        key: 'getNumKeysOverLimit',
        value: function getNumKeysOverLimit() {
            return this._keysOverLimit;
        }
    }, {
        key: 'getNumValuesOverLimit',
        value: function getNumValuesOverLimit() {
            return this._valuesOverLimit;
        }
    }, {
        key: 'toThrift',
        value: function toThrift() {
            var _this = this;

            this._clearOverLimits();
            var thriftFields = [];
            (0, _each3.default)(this._fields, function (value, key) {
                if (!key || !value) {
                    return;
                }
                var keyStr = _this.getFieldKey(key);
                var valStr = _this.getFieldValue(value);
                thriftFields.push(new _platform_abstraction_layer.crouton_thrift.KeyValue({
                    Key: keyStr,
                    Value: valStr
                }));
            });

            return new _platform_abstraction_layer.crouton_thrift.LogRecord({
                timestamp_micros: this._timestampMicros,
                fields: thriftFields
            });
        }
    }, {
        key: 'getFieldKey',
        value: function getFieldKey(key) {
            var keyStr = coerce.toString(key);
            if (keyStr.length > this._logFieldKeyHardLimit) {
                this._keysOverLimit += 1;
                keyStr = keyStr.substr(0, this._logFieldKeyHardLimit) + '...';
            }
            return keyStr;
        }
    }, {
        key: 'getFieldValue',
        value: function getFieldValue(value) {
            var valStr = null;
            if (value instanceof Object) {
                try {
                    valStr = JSON.stringify(value, null, '  ');
                } catch (e) {
                    valStr = 'Could not encode value. Exception: ' + e;
                }
            } else {
                valStr = coerce.toString(value);
            }
            if (valStr.length > this._logFieldValueHardLimit) {
                this._valuesOverLimit += 1;
                valStr = valStr.substr(0, this._logFieldValueHardLimit) + '...';
            }
            return valStr;
        }
    }, {
        key: 'toProto',
        value: function toProto() {
            var _this2 = this;

            this._clearOverLimits();
            var log = new proto.Log();
            var ts = new googleProtobufTimestampPB.Timestamp();
            var secs = Math.floor(this._timestampMicros / 1000000);
            var nanos = this._timestampMicros % 1000000;
            ts.setSeconds(secs);
            ts.setNanos(nanos);
            log.setTimestamp(ts);
            var keyValues = [];
            (0, _each3.default)(this._fields, function (value, key) {
                if (!key || !value) {
                    return;
                }
                var keyStr = _this2.getFieldKey(key);
                var valStr = _this2.getFieldValue(value);

                var keyValue = new proto.KeyValue();
                keyValue.setKey(keyStr);
                keyValue.setStringValue(valStr);
                keyValues.push(keyValue);
            });

            log.setFieldsList(keyValues);

            return log;
        }
    }]);

    return LogRecordImp;
}();

exports.default = LogRecordImp;
module.exports = exports['default'];

//# sourceMappingURL=log_record_imp.js.map