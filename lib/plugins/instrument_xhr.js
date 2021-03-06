'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _each2 = require('../_each');

var _each3 = _interopRequireDefault(_each2);

var _opentracing = require('opentracing');

var opentracing = _interopRequireWildcard(_opentracing);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Capture the proxied values on script load (i.e. ASAP) in case there are
// multiple layers of instrumentation.
var proxied = {};
if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && typeof window.XMLHttpRequest !== 'undefined') {
    proxied = {
        XMLHttpRequest: XMLHttpRequest,
        open: XMLHttpRequest.prototype.open,
        send: XMLHttpRequest.prototype.send,
        setRequestHeader: XMLHttpRequest.prototype.setRequestHeader
    };
}

function getCookies() {
    if (typeof document === 'undefined' || !document.cookie) {
        return null;
    }
    var cookies = document.cookie.split(';');
    var data = {};
    var count = 0;
    for (var i = 0; i < cookies.length; i++) {
        var parts = cookies[i].split('=', 2);
        if (parts.length === 2) {
            var key = parts[0].replace(/^\s+/, '').replace(/\s+$/, '');
            data[key] = decodeURIComponent(parts[1]);
            try {
                data[key] = JSON.parse(data[key]);
            } catch (_ignored) {/* Ignored */}
            count++;
        }
    }
    if (count > 0) {
        return data;
    }
    return null;
}

// Normalize the getAllResponseHeaders output
function getResponseHeaders(xhr) {
    var raw = xhr.getAllResponseHeaders();
    var parts = raw.replace(/\s+$/, '').split(/\n/);
    for (var i = 0; i < parts.length; i++) {
        parts[i] = parts[i].replace(/\r/g, '').replace(/^\s+/, '').replace(/\s+$/, '');
    }
    return parts;
}

// Automatically create spans for all XMLHttpRequest objects.
//
// NOTE: this code currently works only with a single Tracer.
//

var InstrumentXHR = function () {
    function InstrumentXHR() {
        _classCallCheck(this, InstrumentXHR);

        this._enabled = this._isValidContext();
        this._proxyInited = false;
        this._internalExclusions = [];
        this._tracer = null;
        this._handleOptions = this._handleOptions.bind(this);

        if (!this._enabled) {
            return;
        }
    }

    _createClass(InstrumentXHR, [{
        key: 'name',
        value: function name() {
            return 'instrument_xhr';
        }
    }, {
        key: 'addOptions',
        value: function addOptions(tracerImp) {
            tracerImp.addOption('xhr_instrumentation', { type: 'bool', defaultValue: false });
            tracerImp.addOption('xhr_url_inclusion_patterns', { type: 'array', defaultValue: [/.*/] });
            tracerImp.addOption('xhr_url_exclusion_patterns', { type: 'array', defaultValue: [] });
        }
    }, {
        key: 'start',
        value: function start(tracerImp) {
            if (!this._enabled) {
                return;
            }
            this._tracer = tracerImp;

            var currentOptions = tracerImp.options();
            this._addServiceHostToExclusions(currentOptions);
            this._handleOptions({}, currentOptions);
            tracerImp.on('options', this._handleOptions);
        }
    }, {
        key: 'stop',
        value: function stop() {
            if (!this._enabled) {
                return;
            }
            var proto = proxied.XMLHttpRequest.prototype;
            proto.open = proxied.open;
            proto.send = proxied.send;
        }

        /**
         * Respond to options changes on the Tracer.
         *
         * Note that `modified` is the options that have changed in this call,
         * along with their previous and new values. `current` is the full set of
         * current options *including* the newly modified values.
         */

    }, {
        key: '_handleOptions',
        value: function _handleOptions(modified, current) {
            // Automatically add the service host itself to the list of exclusions
            // to avoid reporting on the reports themselves
            var serviceHost = modified.collector_host;
            if (serviceHost) {
                this._addServiceHostToExclusions(current);
            }

            // Set up the proxied XHR calls unless disabled
            if (!this._proxyInited && current.xhr_instrumentation) {
                this._proxyInited = true;
                var proto = proxied.XMLHttpRequest.prototype;
                proto.setRequestHeader = this._instrumentSetRequestHeader();
                proto.open = this._instrumentOpen();
                proto.send = this._instrumentSend();
            }
        }

        /**
         * Ensure that the reports to the collector don't get instrumented as well,
         * as that recursive instrumentation is more confusing than valuable!
         */

    }, {
        key: '_addServiceHostToExclusions',
        value: function _addServiceHostToExclusions(opts) {
            if (opts.collector_host.length === 0) {
                return;
            }

            // http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
            function escapeRegExp(str) {
                return ('' + str).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            }

            // Check against the hostname without the port as well as the canonicalized
            // URL may drop the standard port.
            var host = escapeRegExp(opts.collector_host);
            var port = escapeRegExp(opts.collector_port);
            var set = [new RegExp('^https?://' + host + ':' + port)];
            if (port === '80') {
                set.push(new RegExp('^http://' + host));
            } else if (port === '443') {
                set.push(new RegExp('^https://' + host));
            }
            this._internalExclusions = set;
        }

        /**
         * Check preconditions for the auto-instrumentation of XHRs to work properly.
         * There are a lot of potential JavaScript platforms.
         */

    }, {
        key: '_isValidContext',
        value: function _isValidContext() {
            if (typeof window === 'undefined') {
                return false;
            }
            if (!window.XMLHttpRequest) {
                return false;
            }
            if (!window.XMLHttpRequest.prototype) {
                return false;
            }
            return true;
        }
    }, {
        key: '_instrumentSetRequestHeader',
        value: function _instrumentSetRequestHeader() {
            return function (header, value) {
                this.__requestHeaders = this.__requestHeaders || {};
                this.__requestHeaders[header] = value;
                return proxied.setRequestHeader.apply(this, arguments);
            };
        }
    }, {
        key: '_instrumentOpen',
        value: function _instrumentOpen() {
            var self = this;
            var tracer = this._tracer;

            return function (method, url, asyncArg, user, password) {
                if (!self._shouldTrace(tracer, this, url)) {
                    return proxied.open.apply(this, arguments);
                }

                var span = tracer.startSpan('XMLHttpRequest');
                tracer.addActiveRootSpan(span);
                this.__tracer_span = span;
                this.__tracer_url = url;

                var tags = {
                    method: method,
                    url: url,
                    async: asyncArg,
                    user: user
                };
                if (url) {
                    tags.url_pathname = url.split('?')[0];
                }

                var openPayload = {};
                (0, _each3.default)(tags, function (val, key) {
                    openPayload[key] = val;
                });
                openPayload.cookies = getCookies();

                // Note: async defaults to true
                var async = asyncArg === undefined ? true : asyncArg;
                if (async) {
                    this.addEventListener('readystatechange', function () {
                        if (this.readyState === 0) {
                            span.log({
                                readyState: 0,
                                event: 'unsent'
                            });
                        } else if (this.readyState === 1) {
                            span.log({
                                readyState: 1,
                                event: 'sending'
                            });
                        } else if (this.readyState === 2) {
                            span.log({
                                readyState: 2,
                                event: 'headers received',
                                method: method,
                                url: url,
                                openPayload: openPayload,
                                headers: getResponseHeaders(this)
                            });
                            span.addTags(tags);
                        } else if (this.readyState === 3) {
                            span.log({
                                readyState: 3,
                                event: 'loading'
                            });
                        } else if (this.readyState === 4) {
                            var responseType = this.responseType;
                            span.log({
                                readyState: 4,
                                url: url,
                                method: method,
                                headers: getResponseHeaders(this),
                                status: this.status,
                                statusText: this.statusText,
                                responseType: responseType
                            });
                            tracer.removeActiveRootSpan(span);
                            span.finish();
                        } else {
                            span.log({
                                readyState: this.readyState
                            });
                        }
                    });
                }

                var result = proxied.open.apply(this, arguments);
                if (!async) {
                    tracer.removeActiveRootSpan(span);
                    span.finish();
                }
                return result;
            };
        }
    }, {
        key: '_instrumentSend',
        value: function _instrumentSend() {
            var self = this;
            var tracer = this._tracer;
            return function () {
                var _this = this;

                if (!self._shouldTrace(tracer, this, this.__tracer_url)) {
                    return proxied.send.apply(this, arguments);
                }

                var span = this.__tracer_span;
                if (!span) {
                    return proxied.send.apply(this, arguments);
                }

                var data = Array.prototype.slice.call(arguments);
                var len = undefined;
                if (data.length === 1) {
                    if (data[0] && data[0].length) {
                        len = data[0].length;
                    }
                    try {
                        data = JSON.parse(data[0]);
                    } catch (e) {
                        // Ignore the error
                    }
                }
                var lenStr = len === undefined ? '' : ', data length=' + len;
                span.log({
                    event: 'send',
                    data_length: lenStr
                });

                // Add Open-Tracing headers
                var headersCarrier = {};
                tracer.inject(span.context(), opentracing.FORMAT_HTTP_HEADERS, headersCarrier);
                var keys = Object.keys(headersCarrier);
                keys.forEach(function (key) {
                    proxied.setRequestHeader.call(_this, key, headersCarrier[key]);
                });

                return proxied.send.apply(this, arguments);
            };
        }
    }, {
        key: '_shouldTrace',
        value: function _shouldTrace(tracer, xhr, url) {
            // This shouldn't be possible, but let's be paranoid
            if (!tracer) {
                return false;
            }

            var opts = tracer.options();
            if (opts.disabled) {
                return false;
            }
            if (!url) {
                return false;
            }
            for (var key in this._internalExclusions) {
                if (!this._internalExclusions.hasOwnProperty(key)) {
                    continue;
                }
                var ex = this._internalExclusions[key];
                if (ex.test(url)) {
                    return false;
                }
            }
            var include = false;
            for (var _key in opts.xhr_url_inclusion_patterns) {
                if (!opts.xhr_url_inclusion_patterns.hasOwnProperty(_key)) {
                    continue;
                }
                var inc = opts.xhr_url_inclusion_patterns[_key];
                if (inc.test(url)) {
                    include = true;
                    break;
                }
            }
            if (!include) {
                return false;
            }
            for (var _key2 in opts.xhr_url_exclusion_patterns) {
                if (!opts.xhr_url_exclusion_patterns.hasOwnProperty(_key2)) {
                    continue;
                }
                var _ex = opts.xhr_url_exclusion_patterns[_key2];
                if (_ex.test(url)) {
                    return false;
                }
            }
            return true;
        }
    }]);

    return InstrumentXHR;
}();

module.exports = new InstrumentXHR();

//# sourceMappingURL=instrument_xhr.js.map