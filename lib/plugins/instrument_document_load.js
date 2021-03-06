'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _each2 = require('../_each');

var _each3 = _interopRequireDefault(_each2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var InstrumentPageLoad = function () {
    function InstrumentPageLoad() {
        _classCallCheck(this, InstrumentPageLoad);

        this._inited = false;
        this._span = null;
    }

    _createClass(InstrumentPageLoad, [{
        key: 'name',
        value: function name() {
            return 'instrument_page_load';
        }
    }, {
        key: 'addOptions',
        value: function addOptions(tracerImp) {
            tracerImp.addOption('instrument_page_load', { type: 'bool', defaultValue: false });
        }
    }, {
        key: 'start',
        value: function start(tracerImp) {
            if (this._inited) {
                return;
            }
            this._inited = true;

            if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object' || (typeof document === 'undefined' ? 'undefined' : _typeof(document)) !== 'object') {
                return;
            }

            var currentOptions = tracerImp.options();
            if (currentOptions.instrument_page_load) {
                this._ensureSpanStarted(tracerImp);
                document.addEventListener('readystatechange', this._handleReadyStateChange.bind(this));
            }
        }
    }, {
        key: 'stop',
        value: function stop() {}
    }, {
        key: '_ensureSpanStarted',
        value: function _ensureSpanStarted(tracerImp) {
            if (!this._span) {
                this._span = tracerImp.startSpan('document/load');
                tracerImp.addActiveRootSpan(this._span);
            }
        }
    }, {
        key: '_handleReadyStateChange',
        value: function _handleReadyStateChange() {
            if (!this._span) {
                return;
            }

            var span = this._span;
            var state = document.readyState;
            var payload = undefined;
            if (state === 'complete') {
                payload = {};
                if (window.performance && performance.timing) {
                    this._addTimingSpans(span, performance.timing);
                    payload['window.performance.timing'] = performance.timing;
                }
            }

            span.logEvent('document.readystatechange ' + state, payload);

            if (state === 'complete') {
                if (span.tracer()) {
                    span.tracer().removeActiveRootSpan(span.tracer());
                }
                span.finish();
            }
        }
    }, {
        key: '_copyNavigatorProperties',
        value: function _copyNavigatorProperties(nav) {
            var dst = {};
            for (var key in nav) {
                // eslint-disable-line guard-for-in
                try {
                    var value = nav[key];
                    switch (key) {

                        case 'plugins':
                            {
                                var p = [];
                                for (var i = 0; i < value.length; i++) {
                                    var item = value.item(i);
                                    p.push({
                                        name: item.name,
                                        description: item.description
                                    });
                                }
                                dst[key] = p;
                            }break;

                        case 'mimeTypes':
                            {
                                var _p = [];
                                for (var _i = 0; _i < value.length; _i++) {
                                    var _item = value.item(_i);
                                    _p.push({
                                        type: _item.type,
                                        description: _item.description,
                                        suffixes: _item.suffixes
                                    });
                                }
                                dst[key] = _p;
                            }break;

                        default:
                            dst[key] = value;
                            break;
                    }
                } catch (e) {
                    // Skip, just in case
                }
            }
            return dst;
        }

        // Retroactively create the appropriate spans and logs

    }, {
        key: '_addTimingSpans',
        value: function _addTimingSpans(parentImp, timing) {
            var _this = this;

            // NOTE: this currently relies on LightStep-specific APIs
            if (!parentImp) {
                return;
            }

            parentImp.setTag('user_agent', navigator.userAgent);

            (0, _each3.default)(timing, function (value, key) {
                // e.g. secureConnectionStart is not always set
                if (typeof value !== 'number' || value === 0) {
                    return;
                }

                var payload = undefined;

                if (key === 'navigationStart' && (typeof navigator === 'undefined' ? 'undefined' : _typeof(navigator)) === 'object') {
                    payload = {
                        navigator: _this._copyNavigatorProperties(navigator)
                    };
                }
                parentImp.log({
                    message: 'document ' + key,
                    payload: payload
                }, value);
            });

            if (window.chrome && window.chrome.loadTimes) {
                var chromeTimes = window.chrome.loadTimes();
                if (chromeTimes) {
                    parentImp.log({
                        message: 'window.chrome.loadTimes()',
                        payload: chromeTimes
                    }, timing.domComplete);
                }
            }

            parentImp.setBeginMicros(timing.navigationStart * 1000.0);

            parentImp.tracer().startSpan('document/time_to_first_byte', { childOf: parentImp }).setBeginMicros(timing.requestStart * 1000.0).setEndMicros(timing.responseStart * 1000.0).finish();
            parentImp.tracer().startSpan('document/response_transfer', { childOf: parentImp }).setBeginMicros(timing.responseStart * 1000.0).setEndMicros(timing.responseEnd * 1000.0).finish();
            parentImp.tracer().startSpan('document/dom_load', { childOf: parentImp }).setBeginMicros(timing.domLoading * 1000.0).setEndMicros(timing.domInteractive * 1000.0).finish();
        }
    }]);

    return InstrumentPageLoad;
}();

module.exports = new InstrumentPageLoad();

//# sourceMappingURL=instrument_document_load.js.map