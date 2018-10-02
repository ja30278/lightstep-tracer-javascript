'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var optionsParser = require('./options_parser.js');
var util = require('./util');

var kRuntimeGUIDCookiePrefix = 'lightstep_guid';
var kSessionIDCookieKey = 'lightstep_session_id';
var kCookieTimeToLiveSeconds = 7 * 24 * 60 * 60;

var nowMicrosImp = function () {
    // Is a hi-res timer available?
    if (window.performance && window.performance.now && window.performance.timing && window.performance.timing.navigationStart) {
        var _ret = function () {
            var start = performance.timing.navigationStart;
            return {
                v: function v() {
                    return Math.floor((start + performance.now()) * 1000.0);
                }
            };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }
    // The low-res timer is the best we can do
    return function () {
        return Date.now() * 1000.0;
    };
}();

var PlatformBrowser = function () {
    function PlatformBrowser() {
        _classCallCheck(this, PlatformBrowser);
    }

    _createClass(PlatformBrowser, [{
        key: 'name',
        value: function name() {
            return 'browser';
        }
    }, {
        key: 'nowMicros',
        value: function nowMicros() {
            return nowMicrosImp();
        }

        // Return the GUID to use for the runtime. The intention is to reuse the
        // GUID so that logically a single browser session looks like a single
        // runtime.

    }, {
        key: 'runtimeGUID',
        value: function runtimeGUID(groupName) {
            // Account for the groupName in the same that multiple apps or services
            // are running on the same domain (and should not share the same
            // runtime GUID).
            var cookieKey = kRuntimeGUIDCookiePrefix + '/' + groupName;
            var uuid = util.cookie(cookieKey) || this._generateLongUUID();
            util.cookie(cookieKey, uuid, kCookieTimeToLiveSeconds, '/');

            // Also create a session ID as well to give the server more information
            // to coordinate with.
            var sessionID = util.cookie(kSessionIDCookieKey) || this._generateLongUUID();
            util.cookie(kSessionIDCookieKey, sessionID, kCookieTimeToLiveSeconds, '/');

            return uuid;
        }
    }, {
        key: 'generateUUID',
        value: function generateUUID() {
            return this._generateLongUUID();
        }
    }, {
        key: '_generateLongUUID',
        value: function _generateLongUUID() {
            var p0 = ('00000000' + Math.abs(Math.random() * 0xFFFFFFFF | 0).toString(16)).substr(-8);
            var p1 = ('00000000' + Math.abs(Math.random() * 0xFFFFFFFF | 0).toString(16)).substr(-8);
            return '' + p0 + p1;
        }
    }, {
        key: 'onBeforeExit',
        value: function onBeforeExit() {
            if (window) {
                var _window;

                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments[_key];
                }

                (_window = window).addEventListener.apply(_window, ['beforeunload'].concat(args));
            }
        }
    }, {
        key: 'plugins',
        value: function plugins(opts) {
            return [require('../../../plugins/instrument_xhr'), require('../../../plugins/instrument_document_load')];
        }
    }, {
        key: 'options',
        value: function options(imp) {
            var tracerOpts = {};
            var browserOpts = {};
            optionsParser.parseScriptElementOptions(tracerOpts, browserOpts);
            optionsParser.parseURLQueryOptions(tracerOpts, browserOpts);
            return tracerOpts;
        }
    }, {
        key: 'tracerTags',
        value: function tracerTags() {
            return {
                'lightstep.tracer_platform': 'browser'
            };
        }

        // There's no way to truly "fatal" on the browser; the best approximation
        // is an Error exception.

    }, {
        key: 'fatal',
        value: function fatal(message) {
            throw new Error(message);
        }
    }, {
        key: 'localStoreGet',
        value: function localStoreGet(key) {
            if (!window.sessionStorage) {
                return null;
            }
            try {
                return JSON.parse(sessionStorage.getItem('lightstep/' + key));
            } catch (_ignored) {
                return null;
            }
        }
    }, {
        key: 'localStoreSet',
        value: function localStoreSet(key, value) {
            if (!window.sessionStorage) {
                return;
            }
            try {
                sessionStorage.setItem('lightstep/' + key, JSON.stringify(value));
            } catch (_ignored) {/* Ignored */}
        }
    }], [{
        key: 'initLibrary',
        value: function initLibrary(lib) {
            var tracerOpts = {};
            var browserOpts = {};
            optionsParser.parseScriptElementOptions(tracerOpts, browserOpts);

            if (browserOpts.init_global_tracer) {
                PlatformBrowser.initGlobalTracer(lib, tracerOpts);
            }
        }
    }, {
        key: 'initGlobalTracer',
        value: function initGlobalTracer(lib, opts) {
            if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object') {
                return;
            }
            if (_typeof(window.opentracing) !== 'object') {
                return;
            }
            opentracing.initGlobalTracer(new lib.Tracer(opts)); // eslint-disable-line no-undef
        }
    }]);

    return PlatformBrowser;
}();

module.exports = PlatformBrowser;

//# sourceMappingURL=platform_browser.js.map