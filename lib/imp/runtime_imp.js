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
var converter = require('hex2dec');
var packageObject = require('../../package.json');

var RuntimeImp = function () {
    function RuntimeImp(runtimeGUID, startMicros, componentName, attributes) {
        _classCallCheck(this, RuntimeImp);

        this._runtimeGUID = runtimeGUID;
        this._startMicros = startMicros;
        this._componentName = componentName;
        this._attributes = attributes;
    }

    _createClass(RuntimeImp, [{
        key: 'toThrift',
        value: function toThrift() {
            var thriftAttrs = [];
            (0, _each3.default)(this._attributes, function (val, key) {
                thriftAttrs.push(new _platform_abstraction_layer.crouton_thrift.KeyValue({
                    Key: coerce.toString(key),
                    Value: coerce.toString(val)
                }));
            });

            // NOTE: for legacy reasons, the Thrift field is called "group_name"
            // but is semantically equivalent to the "component_name"
            return new _platform_abstraction_layer.crouton_thrift.Runtime({
                guid: this._runtimeGUID,
                start_micros: this._startMicros,
                group_name: this._componentName,
                attrs: thriftAttrs
            });
        }
    }, {
        key: 'toProto',
        value: function toProto() {
            var tracerVersion = new proto.KeyValue();
            tracerVersion.setKey('lightstep.tracer_version');
            tracerVersion.setStringValue(packageObject.version);

            var tracerPlatform = new proto.KeyValue();
            tracerPlatform.setKey('lightstep.tracer_platform');
            tracerPlatform.setStringValue('browser');

            var componentName = new proto.KeyValue();
            componentName.setKey('lightstep.component_name');
            componentName.setStringValue(this._componentName);

            var reporterId = converter.hexToDec(this._runtimeGUID);

            var reporterProto = new proto.Reporter();
            reporterProto.setReporterId(reporterId);
            reporterProto.setTagsList([tracerVersion, tracerPlatform, componentName]);
            return reporterProto;
        }
    }]);

    return RuntimeImp;
}();

exports.default = RuntimeImp;
module.exports = exports['default'];

//# sourceMappingURL=runtime_imp.js.map