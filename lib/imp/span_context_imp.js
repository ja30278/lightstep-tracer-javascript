'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _each2 = require('../_each');

var _each3 = _interopRequireDefault(_each2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SpanContextImp = function () {
    _createClass(SpanContextImp, [{
        key: 'setBaggageItem',


        // ---------------------------------------------------------------------- //
        // OpenTracing Implementation
        // ---------------------------------------------------------------------- //

        value: function setBaggageItem(key, value) {
            this._baggage[key] = value;
        }
    }, {
        key: 'getBaggageItem',
        value: function getBaggageItem(key) {
            return this._baggage[key];
        }

        // ---------------------------------------------------------------------- //
        // LightStep Extensions
        // ---------------------------------------------------------------------- //

        // This is part of the formal OT API in Go; and will likely be supported
        // across platforms.
        //
        // https://github.com/opentracing/opentracing.github.io/issues/103

    }, {
        key: 'forEachBaggageItem',
        value: function forEachBaggageItem(f) {
            (0, _each3.default)(this._baggage, function (val, key) {
                f(key, val);
            });
        }

        // ---------------------------------------------------------------------- //
        // Private methods
        // ---------------------------------------------------------------------- //

    }]);

    function SpanContextImp(spanGUID, traceGUID) {
        _classCallCheck(this, SpanContextImp);

        this._baggage = {};
        this._guid = spanGUID;
        this._traceGUID = traceGUID;
    }

    return SpanContextImp;
}();

exports.default = SpanContextImp;
module.exports = exports['default'];

//# sourceMappingURL=span_context_imp.js.map