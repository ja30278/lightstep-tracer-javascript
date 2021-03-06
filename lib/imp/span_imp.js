'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _coerce = require('./coerce.js');

var coerce = _interopRequireWildcard(_coerce);

var _constants = require('../constants');

var constants = _interopRequireWildcard(_constants);

var _each2 = require('../_each');

var _each3 = _interopRequireDefault(_each2);

var _opentracing = require('opentracing');

var opentracing = _interopRequireWildcard(_opentracing);

var _platform_abstraction_layer = require('../platform_abstraction_layer');

var _log_record_imp = require('./log_record_imp');

var _log_record_imp2 = _interopRequireDefault(_log_record_imp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // eslint-disable-line camelcase


// eslint-disable-line camelcase
var converter = require('hex2dec');
var proto = require('./generated_proto/collector_pb.js');
var googleProtobufTimestampPB = require('google-protobuf/google/protobuf/timestamp_pb.js');

var SpanImp = function (_opentracing$Span) {
    _inherits(SpanImp, _opentracing$Span);

    _createClass(SpanImp, [{
        key: '_tracer',


        // ---------------------------------------------------------------------- //
        // opentracing.Span SPI
        // ---------------------------------------------------------------------- //

        value: function _tracer() {
            return this._tracerImp;
        }
    }, {
        key: '_context',
        value: function _context() {
            return this._ctx;
        }
    }, {
        key: '_setOperationName',
        value: function _setOperationName(name) {
            this._operationName = '' + name;
        }
    }, {
        key: '_addTags',
        value: function _addTags(keyValuePairs) {
            var self = this;
            (0, _each3.default)(keyValuePairs, function (value, key) {
                self._tags[key] = value;
            });
        }
    }, {
        key: '_log',
        value: function _log(keyValuePairs, timestamp) {
            var self = this;
            var argumentType = typeof keyValuePairs === 'undefined' ? 'undefined' : _typeof(keyValuePairs);
            if (argumentType !== 'object') {
                self._tracerImp._error('Span.log() expects an object as its first argument');
                return;
            }

            var tsMicros = timestamp ? timestamp * 1000 : self._tracerImp._platform.nowMicros();

            var record = new _log_record_imp2.default(self._tracerImp.getLogFieldKeyHardLimit(), self._tracerImp.getLogFieldValueHardLimit(), tsMicros, keyValuePairs);
            self._log_records = self._log_records || [];
            self._log_records.push(record);
            self._tracerImp.emit('log_added', record);
        }
    }, {
        key: '_finish',
        value: function _finish(finishTime) {
            return this.end(finishTime);
        }

        // ---------------------------------------------------------------------- //
        // Private methods
        // ---------------------------------------------------------------------- //

    }]);

    function SpanImp(tracer, name, spanContext) {
        _classCallCheck(this, SpanImp);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(SpanImp).call(this));

        console.assert((typeof tracer === 'undefined' ? 'undefined' : _typeof(tracer)) === 'object', 'Invalid runtime'); // eslint-disable-line no-console

        _this._tracerImp = tracer;
        _this._ctx = spanContext;
        _this._ended = false;

        _this._operationName = name;
        _this._tags = {};
        _this._beginMicros = tracer._platform.nowMicros();
        _this._endMicros = 0;
        _this._errorFlag = false;
        _this._log_records = null;
        return _this;
    }

    // ---------------------------------------------------------------------- //
    // LightStep Extensions
    // ---------------------------------------------------------------------- //

    _createClass(SpanImp, [{
        key: 'getOperationName',
        value: function getOperationName() {
            return this._operationName;
        }

        // Getter only. The GUID is immutable once set internally.

    }, {
        key: 'guid',
        value: function guid() {
            return this._ctx._guid;
        }
    }, {
        key: 'traceGUID',
        value: function traceGUID() {
            return this._ctx._traceGUID;
        }
    }, {
        key: 'parentGUID',
        value: function parentGUID() {
            return this._tags.parent_span_guid;
        }
    }, {
        key: 'setParentGUID',
        value: function setParentGUID(guid) {
            this._tags.parent_span_guid = coerce.toString(guid);
            return this;
        }
    }, {
        key: 'beginMicros',
        value: function beginMicros() {
            return this._beginMicros;
        }
    }, {
        key: 'setBeginMicros',
        value: function setBeginMicros(micros) {
            this._beginMicros = micros;
            return this;
        }
    }, {
        key: 'endMicros',
        value: function endMicros() {
            return this._endMicros;
        }
    }, {
        key: 'setEndMicros',
        value: function setEndMicros(micros) {
            this._endMicros = micros;
            return this;
        }

        /**
         * Returns a URL to the trace containing this span.
         *
         * Unlike most methods, it *is* safe to call this method after `finish()`.
         *
         * @return {string} the absolute URL for the span
         */

    }, {
        key: 'generateTraceURL',
        value: function generateTraceURL() {
            var micros = void 0;
            if (this._beginMicros > 0 && this._endMicros > 0) {
                micros = Math.floor((this._beginMicros + this._endMicros) / 2);
            } else {
                micros = this._tracerImp._platform.nowMicros();
            }

            var urlPrefix = constants.LIGHTSTEP_APP_URL_PREFIX;
            var accessToken = encodeURIComponent(this._tracerImp.options().access_token);
            var guid = encodeURIComponent(this.guid());
            return urlPrefix + '/' + accessToken + '/trace?span_guid=' + guid + '&at_micros=' + micros;
        }
    }, {
        key: 'getTags',
        value: function getTags() {
            return this._tags;
        }

        /**
         * Finishes the span.
         *
         * @param  {Number} finishTime
         *         	Optional Unix timestamp in milliseconds setting an explicit
         *         	finish time for the span.
         */

    }, {
        key: 'end',
        value: function end(finishTime) {
            // Ensure a single span is not recorded multiple times
            if (this._ended) {
                return;
            }
            this._ended = true;

            if (finishTime !== undefined) {
                this._endMicros = finishTime * 1000;
            }

            // Do not set endMicros if it has already been set. This accounts for
            // the case of a span that has had it's times set manually (i.e. allows
            // for retroactively created spans that might not be possible to create
            // in real-time).
            if (this._endMicros === 0) {
                this._endMicros = this._tracerImp._platform.nowMicros();
            }
            this._tracerImp._addSpanRecord(this);
        }
    }, {
        key: '_toThrift',
        value: function _toThrift() {
            var _this2 = this;

            var attributes = [];
            (0, _each3.default)(this._tags, function (value, key) {
                attributes.push(new _platform_abstraction_layer.crouton_thrift.KeyValue({
                    Key: coerce.toString(key),
                    Value: coerce.toString(value)
                }));
            });

            var logs = [];
            (0, _each3.default)(this._log_records, function (logRecord) {
                var logThrift = logRecord.toThrift();
                _this2._tracerImp._counters['logs.keys.over_limit'] += logRecord.getNumKeysOverLimit();
                _this2._tracerImp._counters['logs.values.over_limit'] += logRecord.getNumValuesOverLimit();
                logs.push(logThrift);
            });

            return new _platform_abstraction_layer.crouton_thrift.SpanRecord({
                span_guid: this.guid(),
                trace_guid: this.traceGUID(),
                runtime_guid: this._tracerImp.guid(),
                span_name: this._operationName,
                oldest_micros: this._beginMicros,
                youngest_micros: this._endMicros,
                attributes: attributes,
                error_flag: this._errorFlag,
                log_records: logs
            });
        }
    }, {
        key: '_toProto',
        value: function _toProto() {
            var _this3 = this;

            var spanContextProto = new proto.SpanContext();
            spanContextProto.setTraceId(converter.hexToDec(this.traceGUID()));
            spanContextProto.setSpanId(converter.hexToDec(this.guid()));

            var spanProto = new proto.Span();
            spanProto.setSpanContext(spanContextProto);
            spanProto.setOperationName(this._operationName);

            var startTimestamp = new googleProtobufTimestampPB.Timestamp();
            var startSeconds = Math.floor(this._beginMicros / 1000000);
            var startNanos = this._beginMicros % 1000000;
            startTimestamp.setSeconds(startSeconds);
            startTimestamp.setNanos(startNanos);
            spanProto.setStartTimestamp(startTimestamp);
            spanProto.setDurationMicros(this._endMicros - this._beginMicros);

            var logs = [];
            (0, _each3.default)(this._log_records, function (logRecord) {
                var logProto = logRecord.toProto();
                _this3._tracerImp._counters['logs.keys.over_limit'] += logRecord.getNumKeysOverLimit();
                _this3._tracerImp._counters['logs.values.over_limit'] += logRecord.getNumValuesOverLimit();
                logs.push(logProto);
            });
            spanProto.setLogsList(logs);

            var parentSpanGUID = undefined;
            var tags = [];
            (0, _each3.default)(this._tags, function (value, key) {
                var strValue = coerce.toString(value);
                var strKey = coerce.toString(key);
                var tag = new proto.KeyValue();
                if (strKey === 'parent_span_guid') {
                    parentSpanGUID = strValue;
                }
                tag.setKey(strKey);
                tag.setStringValue(strValue);
                tags.push(tag);
            });
            spanProto.setTagsList(tags);

            if (parentSpanGUID !== undefined) {
                var ref = new proto.Reference();
                ref.setRelationship(proto.Reference.Relationship.CHILD_OF);
                var parentSpanContext = new proto.SpanContext();
                parentSpanContext.setSpanId(converter.hexToDec(parentSpanGUID));
                ref.setSpanContext(parentSpanContext);
                spanProto.setReferencesList([ref]);
            }
            return spanProto;
        }
    }]);

    return SpanImp;
}(opentracing.Span);

exports.default = SpanImp;
module.exports = exports['default'];

//# sourceMappingURL=span_imp.js.map