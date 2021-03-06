'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // eslint-disable-line camelcase
// eslint-disable-line camelcase


var _platform_abstraction_layer = require('../platform_abstraction_layer');

var _each2 = require('../_each');

var _each3 = _interopRequireDefault(_each2);

var _coerce = require('./coerce.js');

var coerce = _interopRequireWildcard(_coerce);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var proto = require('./generated_proto/collector_pb.js');

var ReportImp = function () {
    function ReportImp(runtime, oldestMicros, youngestMicros, spanRecords, internalLogs, counters, timestampOffsetMicros) {
        _classCallCheck(this, ReportImp);

        this._runtime = runtime;
        this._oldestMicros = oldestMicros;
        this._youngestMicros = youngestMicros;
        this._spanRecords = spanRecords;
        this._internalLogs = internalLogs;
        this._counters = counters;
        this._timestampOffsetMicros = timestampOffsetMicros;
    }

    _createClass(ReportImp, [{
        key: 'getSpanRecords',
        value: function getSpanRecords() {
            return this._spanRecords;
        }
    }, {
        key: 'getInternalLogs',
        value: function getInternalLogs() {
            return this._internalLogs;
        }
    }, {
        key: 'getCounters',
        value: function getCounters() {
            return this._counters;
        }
    }, {
        key: 'toThrift',
        value: function toThrift() {
            var _this = this;

            (0, _each3.default)(this._spanRecords, function (span) {
                span.runtime_guid = _this._runtimeGUID;
            });

            var thriftCounters = [];
            (0, _each3.default)(this._counters, function (value, key) {
                if (value === 0) {
                    return;
                }
                thriftCounters.push(new _platform_abstraction_layer.crouton_thrift.MetricsSample({
                    name: coerce.toString(key),
                    double_value: coerce.toNumber(value)
                }));
            });

            var thriftSpanRecords = [];
            (0, _each3.default)(this._spanRecords, function (spanRecord) {
                thriftSpanRecords.push(spanRecord._toThrift());
            });

            return new _platform_abstraction_layer.crouton_thrift.ReportRequest({
                runtime: this._runtime.toThrift(),
                oldest_micros: this._oldestMicros,
                youngest_micros: this._youngestMicros,
                span_records: thriftSpanRecords,
                internal_logs: this._internalLogs,
                internal_metrics: new _platform_abstraction_layer.crouton_thrift.Metrics({
                    counts: thriftCounters
                }),
                timestamp_offset_micros: this._timestampOffsetMicros
            });
        }
    }, {
        key: 'toProto',
        value: function toProto(auth) {
            var spansList = [];
            (0, _each3.default)(this._spanRecords, function (spanRecord) {
                spansList.push(spanRecord._toProto());
            });

            var countsList = [];
            (0, _each3.default)(this._counters, function (count) {
                var metricSample = new proto.MetricsSample();
                metricSample.setName(count.name);
                metricSample.setIntValue(count.int64_value);
                metricSample.setDoubleValue(count.double_value);
                countsList.push(metricSample);
            });

            var internalMetrics = new proto.InternalMetrics();
            internalMetrics.setCountsList(countsList);

            var reportProto = new proto.ReportRequest();
            reportProto.setAuth(auth.toProto());
            reportProto.setReporter(this._runtime.toProto());
            reportProto.setSpansList(spansList);
            reportProto.setTimestampOffsetMicros(this._timestampOffsetMicros);
            return reportProto;
        }
    }]);

    return ReportImp;
}();

exports.default = ReportImp;
module.exports = exports['default'];

//# sourceMappingURL=report_imp.js.map