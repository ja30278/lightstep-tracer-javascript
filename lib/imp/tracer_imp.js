'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _opentracing = require('opentracing');

var opentracing = _interopRequireWildcard(_opentracing);

var _span_context_imp = require('./span_context_imp');

var _span_context_imp2 = _interopRequireDefault(_span_context_imp);

var _span_imp = require('./span_imp');

var _span_imp2 = _interopRequireDefault(_span_imp);

var _each2 = require('../_each');

var _each3 = _interopRequireDefault(_each2);

var _platform_abstraction_layer = require('../platform_abstraction_layer');

var _auth_imp = require('./auth_imp');

var _auth_imp2 = _interopRequireDefault(_auth_imp);

var _runtime_imp = require('./runtime_imp');

var _runtime_imp2 = _interopRequireDefault(_runtime_imp);

var _report_imp = require('./report_imp');

var _report_imp2 = _interopRequireDefault(_report_imp);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //============================================================================//
// Imports
//============================================================================//

var ClockState = require('./util/clock_state');
var LogBuilder = require('./log_builder');
var coerce = require('./coerce');
var constants = require('../constants');
var globals = require('./globals');
var packageObject = require('../../package.json');
var util = require('./util/util');

var CARRIER_TRACER_STATE_PREFIX = 'ot-tracer-';
var CARRIER_BAGGAGE_PREFIX = 'ot-baggage-';

var DEFAULT_COLLECTOR_HOSTNAME = 'collector.lightstep.com';
var DEFAULT_COLLECTOR_PORT_TLS = 443;
var DEFAULT_COLLECTOR_PORT_PLAIN = 80;
var DEFAULT_COLLECTOR_PATH = '';

// Internal errors should be rare. Set a low limit to ensure a cascading failure
// does not compound an existing problem by trying to send a great deal of
// internal error data.
var MAX_INTERNAL_LOGS = 20;

var _singleton = null;

var Tracer = function (_opentracing$Tracer) {
    _inherits(Tracer, _opentracing$Tracer);

    function Tracer(opts) {
        _classCallCheck(this, Tracer);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Tracer).call(this));

        _this._delegateEventEmitterMethods();

        opts = opts || {};

        if (!_singleton) {
            globals.setOptions(opts);
            _singleton = _this;
        }

        // Platform abstraction layer
        _this._platform = new _platform_abstraction_layer.Platform(_this);
        _this._runtimeGUID = opts.guid || _this.override_runtime_guid || null; // Set once the group name is set
        _this._plugins = {};
        _this._options = {};
        _this._optionDescs = [];
        _this._makeOptionsTable();

        _this._opentracing = opentracing;
        if (opts.opentracing_module) {
            _this._opentracing = opts.opentracing_module;
        }

        var now = _this._platform.nowMicros();

        // The thrift authentication and runtime struct are created as soon as
        // the necessary initialization options are available.
        _this._startMicros = now;
        _this._auth = null;
        _this._runtime = null;

        var logger = {
            warn: function warn(msg, payload) {
                _this._warn(msg, payload);
            },
            error: function error(err, payload) {
                _this._error(err, payload);
            }
        };

        if (opts) {
            _this._transport = opts.override_transport;
        }

        if (!_this._transport) {
            if (opts.transport && opts.transport === 'thrift') {
                _this._transport = new _platform_abstraction_layer.ThriftTransport(logger);
            } else {
                _this._transport = new _platform_abstraction_layer.ProtoTransport(logger);
            }
        }

        _this._reportingLoopActive = false;
        _this._reportYoungestMicros = now;
        _this._reportTimer = null;
        _this._reportErrorStreak = 0; // Number of consecutive errors
        _this._lastVisibleErrorMillis = 0;
        _this._skippedVisibleErrors = 0;

        // Set addActiveRootSpan() for detail
        _this._activeRootSpanSet = {};
        _this._activeRootSpan = null;

        // For clock skew adjustment.
        _this._useClockState = true;
        _this._clockState = new ClockState({
            nowMicros: function nowMicros() {
                return _this._platform.nowMicros();
            },
            localStoreGet: function localStoreGet() {
                var key = 'clock_state/' + _this._options.collector_host;
                return _this._platform.localStoreGet(key);
            },
            localStoreSet: function localStoreSet(value) {
                var key = 'clock_state/' + _this._options.collector_host;
                return _this._platform.localStoreSet(key, value);
            }
        });

        // Span reporting buffer and per-report data
        // These data are reset on every successful report.
        _this._spanRecords = [];

        // The counter names need to match those accepted by the collector.
        // These are internal counters only.
        _this._counters = {
            'internal.errors': 0,
            'internal.warnings': 0,
            'spans.dropped': 0,
            'logs.dropped': 0,
            'logs.keys.over_limit': 0,
            'logs.values.over_limit': 0,
            'reports.errors.send': 0
        };

        // For internal (not client) logs reported to the collector
        _this._internalLogs = [];

        // Current runtime state / status
        _this._flushIsActive = false;

        // Built-in plugins
        _this.addPlugin(require('../plugins/log_to_console'));

        // Initialize the platform options after the built-in plugins in
        // case any of those options affect the built-ins.
        _this.addPlatformPlugins(opts);
        _this.setPlatformOptions(opts);

        // Set constructor arguments
        if (opts) {
            _this.options(opts);
        }

        // This relies on the options being set: call this last.
        _this._setupReportOnExit();

        _this._info('Tracer created with guid ' + _this._runtimeGUID);

        _this.startPlugins();
        return _this;
    }

    // Morally speaking, Tracer also inherits from EventEmmiter, but we must
    // fake it via composition.
    //
    // If not obvious on inspection: a hack.


    _createClass(Tracer, [{
        key: '_delegateEventEmitterMethods',
        value: function _delegateEventEmitterMethods() {
            var self = this;
            this._ee = new _eventemitter2.default();
            // The list of methods at https://nodejs.org/api/events.html
            (0, _each3.default)(['addListener', 'emit', 'eventNames', 'getMaxListeners', 'listenerCount', 'listeners', 'on', 'once', 'prependListener', 'prependOnceListener', 'removeAllListeners', 'removeListener', 'setMaxListeners'], function (methodName) {
                self[methodName] = function () {
                    if (self._ee[methodName]) {
                        self._ee[methodName].apply(self._ee, arguments);
                    }
                };
            });
        }
    }, {
        key: '_makeOptionsTable',
        value: function _makeOptionsTable() {
            /* eslint-disable key-spacing, no-multi-spaces */

            // NOTE: make 'verbosity' the first option so it is processed first on
            // options changes and takes effect as soon as possible.
            this.addOption('verbosity', { type: 'int', min: 0, max: 9, defaultValue: 1 });

            // Core options
            this.addOption('access_token', { type: 'string', defaultValue: '' });
            this.addOption('component_name', { type: 'string', defaultValue: '' });
            this.addOption('collector_host', { type: 'string', defaultValue: DEFAULT_COLLECTOR_HOSTNAME });
            this.addOption('collector_port', { type: 'int', defaultValue: DEFAULT_COLLECTOR_PORT_TLS });
            this.addOption('collector_path', { type: 'string', defaultValue: DEFAULT_COLLECTOR_PATH });
            this.addOption('collector_encryption', { type: 'string', defaultValue: 'tls' });
            this.addOption('tags', { type: 'any', defaultValue: {} });
            this.addOption('max_reporting_interval_millis', { type: 'int', defaultValue: 2500 });

            // Non-standard, may be deprecated
            this.addOption('disabled', { type: 'bool', defaultValue: false });
            this.addOption('max_span_records', { type: 'int', defaultValue: 4096 });
            this.addOption('default_span_tags', { type: 'any', defaultValue: {} });
            this.addOption('report_timeout_millis', { type: 'int', defaultValue: 30000 });
            this.addOption('gzip_json_requests', { type: 'bool', defaultValue: true });
            this.addOption('disable_reporting_loop', { type: 'bool', defaultValue: false });
            this.addOption('disable_report_on_exit', { type: 'bool', defaultValue: false });
            this.addOption('delay_initial_report_millis', { type: 'int', defaultValue: 1000 });
            this.addOption('error_throttle_millis', { type: 'int', defaultValue: 60000 });

            // Debugging options
            //
            // These are not part of the supported public API.
            //
            // If false, SSL certificate verification is skipped. Useful for testing.
            this.addOption('certificate_verification', { type: 'bool', defaultValue: true });
            // I.e. report only on explicit calls to flush()

            // Unit testing options
            this.addOption('override_transport', { type: 'any', defaultValue: null });
            this.addOption('silent', { type: 'bool', defaultValue: false });

            // Hard upper limits to protect against worst-case scenarios for log field sizes.
            this.addOption('log_field_key_hard_limit', { type: 'int', defaultValue: 256 });
            this.addOption('log_field_value_hard_limit', { type: 'int', defaultValue: 1024 });

            /* eslint-disable key-spacing, no-multi-spaces */
        }

        // ---------------------------------------------------------------------- //
        // opentracing.Tracer SPI
        // ---------------------------------------------------------------------- //

    }, {
        key: '_startSpan',
        value: function _startSpan(name, fields) {
            var _this2 = this;

            // First, assemble the SpanContextImp for our SpanImp.
            var parentCtxImp = null;
            fields = fields || {};
            if (fields.references) {
                for (var i = 0; i < fields.references.length; i++) {
                    var ref = fields.references[i];
                    var type = ref.type();
                    if (type === this._opentracing.REFERENCE_CHILD_OF || type === this._opentracing.REFERENCE_FOLLOWS_FROM) {
                        var context = ref.referencedContext();
                        if (!context) {
                            this._error('Span reference has an invalid context', context);
                            continue;
                        }
                        parentCtxImp = context;
                        break;
                    }
                }
            }

            var traceGUID = parentCtxImp ? parentCtxImp._traceGUID : this.generateTraceGUIDForRootSpan();
            var spanImp = new _span_imp2.default(this, name, new _span_context_imp2.default(this._platform.generateUUID(), traceGUID));
            spanImp.addTags(this._options.default_span_tags);

            (0, _each3.default)(fields, function (value, key) {
                switch (key) {
                    case 'references':
                        // Ignore: handled before constructing the span
                        break;
                    case 'startTime':
                        // startTime is in milliseconds
                        spanImp.setBeginMicros(value * 1000);
                        break;
                    case 'tags':
                        spanImp.addTags(value);
                        break;
                    default:
                        _this2._warn('Ignoring unknown field \'' + key + '\'');
                        break;
                }
            });

            if (parentCtxImp !== null) {
                spanImp.setParentGUID(parentCtxImp._guid);
            }

            this.emit('start_span', spanImp);
            return spanImp;
        }
    }, {
        key: '_inject',
        value: function _inject(spanContext, format, carrier) {
            switch (format) {
                case this._opentracing.FORMAT_HTTP_HEADERS:
                case this._opentracing.FORMAT_TEXT_MAP:
                    this._injectToTextMap(spanContext, carrier);
                    break;

                case this._opentracing.FORMAT_BINARY:
                    this._error('Unsupported format: ' + format);
                    break;

                default:
                    this._error('Unknown format: ' + format);
                    break;
            }
        }
    }, {
        key: '_injectToTextMap',
        value: function _injectToTextMap(spanContext, carrier) {
            if (!carrier) {
                this._error('Unexpected null FORMAT_TEXT_MAP carrier in call to inject');
                return;
            }
            if ((typeof carrier === 'undefined' ? 'undefined' : _typeof(carrier)) !== 'object') {
                this._error('Unexpected \'' + (typeof carrier === 'undefined' ? 'undefined' : _typeof(carrier)) + '\' FORMAT_TEXT_MAP carrier in call to inject');
                return;
            }

            carrier[CARRIER_TRACER_STATE_PREFIX + 'spanid'] = spanContext._guid;
            carrier[CARRIER_TRACER_STATE_PREFIX + 'traceid'] = spanContext._traceGUID;
            spanContext.forEachBaggageItem(function (key, value) {
                carrier['' + CARRIER_BAGGAGE_PREFIX + key] = value;
            });
            carrier[CARRIER_TRACER_STATE_PREFIX + 'sampled'] = 'true';
            return carrier;
        }
    }, {
        key: '_extract',
        value: function _extract(format, carrier) {
            switch (format) {
                case this._opentracing.FORMAT_HTTP_HEADERS:
                case this._opentracing.FORMAT_TEXT_MAP:
                    return this._extractTextMap(format, carrier);

                case this._opentracing.FORMAT_BINARY:
                    this._error('Unsupported format: ' + format);
                    return null;

                default:
                    this._error('Unsupported format: ' + format);
                    return null;
            }
        }
    }, {
        key: '_extractTextMap',
        value: function _extractTextMap(format, carrier) {
            var _this3 = this;

            // Begin with the empty SpanContextImp
            var spanContext = new _span_context_imp2.default(null, null);

            // Iterate over the contents of the carrier and set the properties
            // accordingly.
            var foundFields = 0;
            (0, _each3.default)(carrier, function (value, key) {
                key = key.toLowerCase();
                if (key.substr(0, CARRIER_TRACER_STATE_PREFIX.length) !== CARRIER_TRACER_STATE_PREFIX) {
                    return;
                }
                var suffix = key.substr(CARRIER_TRACER_STATE_PREFIX.length);

                switch (suffix) {
                    case 'traceid':
                        foundFields++;
                        spanContext._traceGUID = value;
                        break;
                    case 'spanid':
                        foundFields++;
                        spanContext._guid = value;
                        break;
                    case 'sampled':
                        // Ignored. The carrier may be coming from a different client
                        // library that sends this (even though it's not used).
                        break;
                    default:
                        _this3._error('Unrecognized carrier key \'' + key + '\' with recognized prefix. Ignoring.');
                        break;
                }
            });

            if (foundFields === 0) {
                // This is not an error per se, there was simply no SpanContext
                // in the carrier.
                return null;
            }
            if (foundFields < 2) {
                // A partial SpanContext suggests some sort of data corruption.
                this._error('Only found a partial SpanContext: ' + format + ', ' + carrier);
                return null;
            }

            (0, _each3.default)(carrier, function (value, key) {
                key = key.toLowerCase();
                if (key.substr(0, CARRIER_BAGGAGE_PREFIX.length) !== CARRIER_BAGGAGE_PREFIX) {
                    return;
                }
                var suffix = key.substr(CARRIER_BAGGAGE_PREFIX.length);
                spanContext.setBaggageItem(suffix, value);
            });
            return spanContext;
        }

        // ---------------------------------------------------------------------- //
        // LightStep extensions
        // ---------------------------------------------------------------------- //

        /**
         * Manually sends a report of all buffered data.
         *
         * @param  {Function} done - callback function invoked when the report
         *         either succeeds or fails.
         */

    }, {
        key: 'flush',
        value: function flush(done) {
            if (!done) {
                done = function done() {};
            }
            if (this._options.disabled) {
                this._warn('Manual flush() called in disabled state.');
                return done(null);
            }
            this._flushReport(true, false, done);
        }

        //-----------------------------------------------------------------------//
        // Options
        //-----------------------------------------------------------------------//

    }, {
        key: 'guid',
        value: function guid() {
            return this._runtimeGUID;
        }
    }, {
        key: 'verbosity',
        value: function verbosity() {
            // The 'undefined' handling below is for logs that may occur before the
            // options are initialized.
            var v = this._options.verbosity;
            return v === undefined ? 1 : v;
        }

        // Call to generate a new Trace GUID

    }, {
        key: 'generateTraceGUIDForRootSpan',
        value: function generateTraceGUIDForRootSpan() {
            var guid = this._platform.generateUUID();
            if (this._activeRootSpan) {
                guid = this._activeRootSpan.traceGUID();
            }
            return guid;
        }
    }, {
        key: 'setPlatformOptions',
        value: function setPlatformOptions(userOptions) {
            var opts = this._platform.options(this) || {};
            (0, _each3.default)(userOptions, function (val, key) {
                opts[key] = val;
            });
            this.options(opts);
        }

        // Register a new option.  Used by plug-ins.

    }, {
        key: 'addOption',
        value: function addOption(name, desc) {
            desc.name = name;
            this._optionDescs.push(desc);
            this._options[desc.name] = desc.defaultValue;
        }
    }, {
        key: 'options',
        value: function options(opts) {
            var _this4 = this;

            if (arguments.length === 0) {
                console.assert(_typeof(this._options) === 'object', // eslint-disable-line
                'Internal error: _options field incorrect');
                return this._options;
            }
            if ((typeof opts === 'undefined' ? 'undefined' : _typeof(opts)) !== 'object') {
                throw new Error('options() must be called with an object: type was ' + (typeof opts === 'undefined' ? 'undefined' : _typeof(opts)));
            }

            // "collector_port" 0 acts as an alias for "use the default".
            if (opts.collector_port === 0) {
                delete opts.collector_port;
            }

            // "collector_encryption" acts an alias for the common cases of 'collector_port'
            if (opts.collector_encryption !== undefined && opts.collector_port === undefined) {
                opts.collector_port = opts.collector_encryption !== 'none' ? DEFAULT_COLLECTOR_PORT_TLS : DEFAULT_COLLECTOR_PORT_PLAIN;
            }

            // Track what options have been modified
            var modified = {};
            var unchanged = {};
            (0, _each3.default)(this._optionDescs, function (desc) {
                _this4._setOptionInternal(modified, unchanged, opts, desc);
            });

            // Check for any invalid options: is there a key in the specified operation
            // that didn't result either in a change or a reset to the existing value?
            for (var key in opts) {
                if (modified[key] === undefined && unchanged[key] === undefined) {
                    this._warn('Invalid option ' + key + ' with value ' + opts[key]);
                }
            }

            //
            // Update the state information based on the changes
            //
            this._initReportingDataIfNeeded(modified);

            if (!this._reportingLoopActive) {
                this._startReportingLoop();
            }

            if (this.verbosity() >= 3) {
                (function () {
                    var optionsString = '';
                    var count = 0;
                    (0, _each3.default)(modified, function (val, key) {
                        optionsString += '\t' + JSON.stringify(key) + ': ' + JSON.stringify(val.newValue) + '\n';
                        count++;
                    });
                    if (count > 0) {
                        _this4._debug('Options modified:\n' + optionsString);
                    }
                })();
            }
            this.emit('options', modified, this._options, this);
        }
    }, {
        key: '_setOptionInternal',
        value: function _setOptionInternal(modified, unchanged, opts, desc) {
            var name = desc.name;
            var value = opts[name];
            var valueType = typeof value === 'undefined' ? 'undefined' : _typeof(value);
            if (value === undefined) {
                return;
            }

            // Parse the option (and check constraints)
            switch (desc.type) {

                case 'any':
                    break;

                case 'bool':
                    if (value !== true && value !== false) {
                        this._error('Invalid boolean option \'' + name + '\' \'' + value + '\'');
                        return;
                    }
                    break;

                case 'int':
                    if (valueType !== 'number' || Math.floor(value) !== value) {
                        this._error('Invalid int option \'' + name + '\' \'' + value + '\'');
                        return;
                    }
                    if (desc.min !== undefined && desc.max !== undefined) {
                        if (!(value >= desc.min && value <= desc.max)) {
                            this._error('Option \'' + name + '\' out of range \'' + value + '\' is not between ' + desc.min + ' and ' + desc.max); // eslint-disable-line max-len
                            return;
                        }
                    }
                    break;

                case 'string':
                    switch (valueType) {
                        case 'string':
                            break;
                        case 'number':
                            value = coerce.toString(value);
                            break;
                        default:
                            this._error('Invalid string option ' + name + ' ' + value);
                            return;
                    }
                    break;

                case 'array':
                    // Per http://stackoverflow.com/questions/4775722/check-if-object-is-array
                    if (Object.prototype.toString.call(value) !== '[object Array]') {
                        this._error('Invalid type for array option ' + name + ': found \'' + valueType + '\'');
                        return;
                    }
                    break;

                default:
                    this._error('Unknown option type \'' + desc.type + '\'');
                    return;
            }

            // Set the new value, recording any modifications
            var oldValue = this._options[name];
            if (oldValue === undefined) {
                throw new Error('Attempt to set unknown option ' + name);
            }

            // Ignore no-op changes for types that can be checked quickly
            if (valueType !== 'object' && oldValue === value) {
                unchanged[name] = true;
                return;
            }

            modified[name] = {
                oldValue: oldValue,
                newValue: value
            };
            this._options[name] = value;
        }

        // The authorization and runtime information is initialized as soon
        // as it is available.  This allows logs and spans to be buffered before
        // the library is initialized, which can be helpul in a complex setup with
        // many subsystems.
        //

    }, {
        key: '_initReportingDataIfNeeded',
        value: function _initReportingDataIfNeeded(modified) {
            var _this5 = this;

            // Ignore redundant initialization; complaint on inconsistencies
            if (this._auth !== null) {
                if (!this._runtime) {
                    return this._error('Inconsistent state: auth initialized without runtime.');
                }
                if (modified.access_token) {
                    throw new Error('Cannot change access_token after it has been set.');
                }
                if (modified.component_name) {
                    throw new Error('Cannot change component_name after it has been set.');
                }
                if (modified.collector_host) {
                    throw new Error('Cannot change collector_host after the connection is established');
                }
                if (modified.collector_port) {
                    throw new Error('Cannot change collector_port after the connection is established');
                }
                if (modified.collector_path) {
                    throw new Error('Cannot change collector_path after the connection is established');
                }
                if (modified.collector_encryption) {
                    throw new Error('Cannot change collector_encryption after the connection is established');
                }
                return;
            }

            // See if the Thrift data can be initialized
            if (this._options.access_token.length > 0 && this._options.component_name.length > 0) {
                (function () {
                    _this5._runtimeGUID = _this5._platform.runtimeGUID(_this5._options.component_name);

                    _this5._auth = new _auth_imp2.default(_this5._options.access_token);

                    //
                    // Assemble the tracer tags from the user-specified and automatic,
                    // internal tags.
                    //
                    var tags = {};
                    (0, _each3.default)(_this5._options.tags, function (value, key) {
                        if (typeof value !== 'string') {
                            _this5._error('Tracer tag value is not a string: key=' + key);
                            return;
                        }
                        tags[key] = value;
                    });
                    tags['lightstep.tracer_version'] = packageObject.version;
                    var platformTags = _this5._platform.tracerTags();
                    (0, _each3.default)(platformTags, function (val, key) {
                        tags[key] = val;
                    });

                    _this5._runtime = new _runtime_imp2.default(_this5._runtimeGUID, _this5._startMicros, _this5._options.component_name, tags);

                    _this5._info('Initializing thrift reporting data', {
                        component_name: _this5._options.component_name,
                        access_token: _this5._auth.getAccessToken()
                    });
                    _this5.emit('reporting_initialized');
                })();
            }
        }
    }, {
        key: 'getLogFieldKeyHardLimit',
        value: function getLogFieldKeyHardLimit() {
            return this._options.log_field_key_hard_limit;
        }
    }, {
        key: 'getLogFieldValueHardLimit',
        value: function getLogFieldValueHardLimit() {
            return this._options.log_field_value_hard_limit;
        }

        //-----------------------------------------------------------------------//
        // Plugins
        //-----------------------------------------------------------------------//

    }, {
        key: 'addPlatformPlugins',
        value: function addPlatformPlugins(opts) {
            var _this6 = this;

            var pluginSet = this._platform.plugins(opts);
            (0, _each3.default)(pluginSet, function (val) {
                _this6.addPlugin(val);
            });
        }
    }, {
        key: 'addPlugin',
        value: function addPlugin(plugin) {
            // Don't add plug-ins twice
            var name = plugin.name();
            if (this._plugins[name]) {
                return;
            }

            this._plugins[name] = plugin;
            plugin.addOptions(this);
        }
    }, {
        key: 'startPlugins',
        value: function startPlugins() {
            var _this7 = this;

            (0, _each3.default)(this._plugins, function (val, key) {
                _this7._plugins[key].start(_this7);
            });
        }

        //-----------------------------------------------------------------------//
        // Spans
        //-----------------------------------------------------------------------//

        // This is a LightStep-specific feature that should be used sparingly. It
        // sets a "global" root span such that spans that would *otherwise* be root
        // span instead inherit the trace GUID of the active root span. This is
        // best clarified by example:
        //
        // On document load in the browser, an "active root span" is created for
        // the page load process. Any spans started without an explicit parent
        // will the document load trace GUID instead of starting a trace GUID.
        // This implicit root remains active only until the page is done loading.
        //
        // Any span adding itself as a root span *must* remove itself along with
        // calling finish(). This will *not* be done automatically.
        //
        // NOTE: currently, only the trace GUID is transferred; it may or may not
        // make sure to make this a proper parent.
        //
        // NOTE: the root span tracking is handled as a set rather than a single
        // global to avoid conflicts between libraries.

    }, {
        key: 'addActiveRootSpan',
        value: function addActiveRootSpan(span) {
            this._activeRootSpanSet[span._guid] = span;
            this._setActiveRootSpanToYoungest();
        }
    }, {
        key: 'removeActiveRootSpan',
        value: function removeActiveRootSpan(span) {
            delete this._activeRootSpanSet[span._guid];
            this._setActiveRootSpanToYoungest();
        }
    }, {
        key: '_setActiveRootSpanToYoungest',
        value: function _setActiveRootSpanToYoungest() {
            var _this8 = this;

            // Set the _activeRootSpan to the youngest of the roots in case of
            // multiple.
            this._activeRootSpan = null;
            (0, _each3.default)(this._activeRootSpanSet, function (span) {
                if (!_this8._activeRootSpan || span._beginMicros > _this8._activeRootSpan._beginMicros) {
                    _this8._activeRootSpan = span;
                }
            });
        }

        //-----------------------------------------------------------------------//
        // Encoding / decoding
        //-----------------------------------------------------------------------//

    }, {
        key: '_objectToUint8Array',
        value: function _objectToUint8Array(obj) {
            var jsonString = void 0;
            try {
                // encodeURIComponent() is a *very* inefficient, but simple and
                // well-supported way to avoid having to think about Unicode in
                // in the conversion to a UInt8Array.
                //
                // Writing multiple bytes for String.charCodeAt and
                // String.codePointAt would be an alternate approach; again,
                // simplicitly is being preferred over efficiency for the moment.
                jsonString = encodeURIComponent(JSON.stringify(obj));
            } catch (e) {
                this._error('Could not binary encode carrier data.');
                return null;
            }

            var buffer = new ArrayBuffer(jsonString.length);
            var view = new Uint8Array(buffer);
            for (var i = 0; i < jsonString.length; i++) {
                var code = jsonString.charCodeAt(i);
                if (!(code >= 0 && code <= 255)) {
                    this._error('Unexpected character code');
                    return null;
                }
                view[i] = code;
            }
            return view;
        }
    }, {
        key: '_uint8ArrayToObject',
        value: function _uint8ArrayToObject(arr) {
            if (!arr) {
                this._error('Array is null');
                return null;
            }

            var jsonString = '';
            for (var i = 0; i < arr.length; i++) {
                jsonString += String.fromCharCode(arr[i]);
            }
            try {
                return JSON.parse(decodeURIComponent(jsonString));
            } catch (e) {
                this._error('Could not decode binary data.');
                return null;
            }
        }

        //-----------------------------------------------------------------------//
        // Logging
        //-----------------------------------------------------------------------//

    }, {
        key: 'log',
        value: function log() {
            var b = new LogBuilder(this);
            return b;
        }

        //-----------------------------------------------------------------------//
        // Buffers
        //-----------------------------------------------------------------------//

    }, {
        key: '_clearBuffers',
        value: function _clearBuffers() {
            this._spanRecords = [];
            this._internalLogs = [];

            // Create a new object to avoid overwriting the values in any references
            // to the old object
            var counters = {};
            (0, _each3.default)(this._counters, function (unused, key) {
                counters[key] = 0;
            });
            this._counters = counters;
        }
    }, {
        key: '_buffersAreEmpty',
        value: function _buffersAreEmpty() {
            if (this._spanRecords.length > 0) {
                return false;
            }
            if (this._internalLogs.length > 0) {
                return false;
            }

            var countersAllZero = true;
            (0, _each3.default)(this._counters, function (val) {
                if (val > 0) {
                    countersAllZero = false;
                }
            });
            return countersAllZero;
        }
    }, {
        key: '_addSpanRecord',
        value: function _addSpanRecord(record) {
            this._internalAddSpanRecord(record);
            this.emit('span_added', record);
        }
    }, {
        key: '_internalAddSpanRecord',
        value: function _internalAddSpanRecord(record) {
            if (!record) {
                this._error('Attempt to add null record to buffer');
                return;
            }

            if (this._spanRecords.length >= this._options.max_span_records) {
                var index = Math.floor(this._spanRecords.length * Math.random());
                this._spanRecords[index] = record;
                this._counters['spans.dropped']++;
            } else {
                this._spanRecords.push(record);
            }
        }
    }, {
        key: '_restoreRecords',
        value: function _restoreRecords(spans, internalLogs, counters) {
            var _this9 = this;

            (0, _each3.default)(spans, function (span) {
                _this9._internalAddSpanRecord(span);
            });

            var currentInternalLogs = this._internalLogs;
            this._internalLogs = [];
            var toAdd = internalLogs.concat(currentInternalLogs);
            (0, _each3.default)(toAdd, function (log) {
                _this9._pushInternalLog(log);
            });

            (0, _each3.default)(counters, function (value, key) {
                if (key in _this9._counters) {
                    _this9._counters[key] += value;
                } else {
                    _this9._error('Bad counter name: ' + key);
                }
            });
        }

        //-----------------------------------------------------------------------//
        // Reporting loop
        //-----------------------------------------------------------------------//

    }, {
        key: '_setupReportOnExit',
        value: function _setupReportOnExit() {
            var _this10 = this;

            if (this._options.disable_report_on_exit) {
                this._debug('report-on-exit is disabled.');
                return;
            }

            // Do a final explicit flush. Note that the final flush may enqueue
            // asynchronous callbacks that cause the 'beforeExit' event to be
            // re-emitted when those callbacks finish.
            var finalFlushOnce = 0;
            var finalFlush = function finalFlush() {
                if (finalFlushOnce++ > 0) {
                    return;
                }
                _this10._info('Final flush before exit.');
                _this10._flushReport(false, true, function (err) {
                    if (err) {
                        _this10._warn('Final report before exit failed', {
                            error: err,
                            unflushed_spans: _this10._spanRecords.length,
                            buffer_youngest_micros: _this10._reportYoungestMicros
                        });
                    }
                });
            };
            this._platform.onBeforeExit(finalFlush);
        }
    }, {
        key: '_startReportingLoop',
        value: function _startReportingLoop() {
            var _this11 = this;

            if (this._options.disabled) {
                this._info('Not starting reporting loop: instrumentation is disabled.');
                return;
            }
            if (this._options.disable_reporting_loop) {
                this._info('Not starting reporting loop: reporting loop is disabled.');
                return;
            }
            if (this._auth === null) {
                // Don't start the loop until the thrift data necessary to do the
                // report is set up.
                return;
            }
            if (this._reportingLoopActive) {
                this._info('Reporting loop already started!');
                return;
            }

            this._info('Starting reporting loop:', this._runtime);
            this._reportingLoopActive = true;

            // Stop the reporting loop so the Node.js process does not become a
            // zombie waiting for the timers.
            var stopReportingOnce = 0;
            var stopReporting = function stopReporting() {
                if (stopReportingOnce++ > 0) {
                    return;
                }
                _this11._stopReportingLoop();
            };
            this._platform.onBeforeExit(stopReporting);

            // Begin the asynchronous reporting loop
            var loop = function loop() {
                _this11._enqueueNextReport(function (err) {
                    if (_this11._reportingLoopActive) {
                        loop();
                    }
                });
            };

            var delay = Math.floor(Math.random() * this._options.delay_initial_report_millis);
            util.detachedTimeout(function () {
                loop();
            }, delay);
        }
    }, {
        key: '_stopReportingLoop',
        value: function _stopReportingLoop() {
            this._debug('Stopping reporting loop');

            this._reportingLoopActive = false;
            clearTimeout(this._reportTimer);
            this._reportTimer = null;
        }
    }, {
        key: '_enqueueNextReport',
        value: function _enqueueNextReport(done) {
            var _this12 = this;

            // If there's already a report request enqueued, ignore this new
            // request.
            if (this._reportTimer) {
                return;
            }

            // If the clock state is still being primed, potentially use the
            // shorted report interval.
            //
            // However, do not use the shorter interval in the case of an error.
            // That does not provide sufficient backoff.
            var reportInterval = this._options.max_reporting_interval_millis;
            if (this._reportErrorStreak === 0 && this._useClockState && !this._clockState.isReady()) {
                reportInterval = Math.min(constants.CLOCK_STATE_REFRESH_INTERVAL_MS, reportInterval);
            }

            // After 3 consecutive errors, expand the retry delay up to 8x the
            // normal interval, jitter the delay by +/- 25%, and be sure to back off
            // *at least* the standard reporting interval in the case of an error.
            var backOff = 1 + Math.min(7, Math.max(0, this._reportErrorStreak));
            var basis = backOff * reportInterval;
            var jitter = 1.0 + (Math.random() * 0.5 - 0.25);
            var delay = Math.floor(Math.max(0, jitter * basis));

            this._debug('Delaying next flush for ' + delay + 'ms');
            this._reportTimer = util.detachedTimeout(function () {
                _this12._reportTimer = null;
                _this12._flushReport(false, false, done);
            }, delay);
        }

        /**
         * Internal worker for a flush of buffered data into a report.
         *
         * @param  {bool} manual - this is a manually invoked flush request. Don't
         *         override this call with a clock state syncing flush, for example.
         * @param  {bool} detached - this is an "at exit" flush that should not block
         *         the calling process in any manner. This is specifically called
         *         "detached" due to the browser use case where the report is done,
         *         not just asynchronously, but as a script request that continues
         *         to run even if the page is navigated away from mid-request.
         * @param  {function} done - standard callback function called on success
         *         or error.
         */

    }, {
        key: '_flushReport',
        value: function _flushReport(manual, detached, done) {
            var _this13 = this;

            done = done || function (err) {};

            var clockReady = this._clockState.isReady();
            var clockOffsetMicros = this._clockState.offsetMicros();

            // Diagnostic information on the clock correction
            this._debug('time correction state', {
                offset_micros: clockOffsetMicros,
                active_samples: this._clockState.activeSampleCount(),
                ready: clockReady
            });

            var spanRecords = this._spanRecords;
            var counters = this._counters;
            var internalLogs = this._internalLogs;

            // If the clock is not ready, do an "empty" flush to build more clock
            // samples before the real data is reported.
            // A detached flush (i.e. one intended to fire at exit or other "last
            // ditch effort" event) should always use the real data.
            if (this._useClockState && !manual && !clockReady && !detached) {
                this._debug('Flushing empty report to prime clock state');
                spanRecords = [];
                counters = {};
                internalLogs = [];
            } else {
                // Early out if we can.
                if (this._buffersAreEmpty()) {
                    this._debug('Skipping empty report');
                    return done(null);
                }

                // Clear the object buffers as the data is now in the local
                // variables
                this._clearBuffers();
                this._debug('Flushing report (' + spanRecords.length + ' spans)');
            }

            this._transport.ensureConnection(this._options);

            // Ensure the runtime GUID is set as it is possible buffer logs and
            // spans before the GUID is necessarily set.
            console.assert(this._runtimeGUID !== null, 'No runtime GUID for Tracer'); // eslint-disable-line no-console

            var timestampOffset = this._useClockState ? clockOffsetMicros : 0;
            var now = this._platform.nowMicros();
            var report = new _report_imp2.default(this._runtime, this._reportYoungestMicros, now, spanRecords, internalLogs, counters, timestampOffset);

            this.emit('prereport', report);
            var originMicros = this._platform.nowMicros();

            this._transport.report(detached, this._auth, report, function (err, res) {
                var destinationMicros = _this13._platform.nowMicros();
                var reportWindowSeconds = (now - report.oldest_micros) / 1e6;

                if (err) {
                    // How many errors in a row? Influences the report backoff.
                    _this13._reportErrorStreak++;

                    // On a failed report, re-enqueue the data that was going to be
                    // sent.
                    var errString = void 0;
                    if (err.message) {
                        errString = '' + err.message;
                    } else {
                        errString = '' + err;
                    }
                    _this13._warn('Error in report: ' + errString, {
                        last_report_seconds_ago: reportWindowSeconds
                    });

                    _this13._restoreRecords(report.getSpanRecords(), report.getInternalLogs(), report.getCounters());

                    // Increment the counter *after* the counters are restored
                    _this13._counters['reports.errors.send']++;

                    _this13.emit('report_error', err, {
                        error: err,
                        streak: _this13._reportErrorStreak,
                        detached: detached
                    });
                } else {
                    if (_this13.verbosity() >= 4) {
                        _this13._debug('Report flushed for last ' + reportWindowSeconds + ' seconds', {
                            spans_reported: report.span_records.length
                        });
                    }

                    // Update internal data after the successful report
                    _this13._reportErrorStreak = 0;
                    _this13._reportYoungestMicros = now;

                    // Update the clock state if there's info from the report
                    if (res) {
                        if (res.timing && res.timing.receive_micros && res.timing.transmit_micros) {
                            _this13._clockState.addSample(originMicros, res.timing.receive_micros, res.timing.transmit_micros, destinationMicros);
                        } else {
                            // The response does not have timing information. Disable
                            // the clock state assuming there'll never be timing data
                            // to use.
                            _this13._useClockState = false;
                        }

                        if (res.errors && res.errors.length > 0) {
                            _this13._warn('Errors in report', res.errors);
                        }
                    } else {
                        _this13._useClockState = false;
                    }

                    _this13.emit('report', report, res);
                }
                return done(err);
            });
        }

        //-----------------------------------------------------------------------//
        // Stats and metrics
        //-----------------------------------------------------------------------//

        /**
         * Internal API that returns some internal metrics.
         */

    }, {
        key: 'stats',
        value: function stats() {
            return {
                counters: this._counters
            };
        }

        //-----------------------------------------------------------------------//
        // Internal logging & errors
        //-----------------------------------------------------------------------//
        // The rules for how internal logs are processed:
        //
        // * Internal logs that are included in the Collector report:
        //      - Always send errors logs along with the reports
        //      - Never include any other logs
        // * Internal logs that are echoed to the host application:
        //      - See the README.md :)
        //

    }, {
        key: '_debug',
        value: function _debug(msg, payload) {
            if (this.verbosity() < 4) {
                return;
            }
            this._printToConsole('log', '[LightStep:DEBUG] ' + msg, payload);
        }
    }, {
        key: '_info',
        value: function _info(msg, payload) {
            if (this.verbosity() < 3) {
                return;
            }
            this._printToConsole('log', '[LightStep:INFO] ' + msg, payload);
        }
    }, {
        key: '_warn',
        value: function _warn(msg, payload) {
            this._counters['internal.warnings']++;

            if (this.verbosity() < 3) {
                return;
            }
            this._printToConsole('warn', '[LightStep:WARN] ' + msg, payload);
        }
    }, {
        key: '_error',
        value: function _error(msg, payload) {
            this._counters['internal.errors']++;

            // Internal errors are always reported to the collector
            var record = this.log().level(constants.LOG_ERROR).message(msg).payload(payload).record();
            this._pushInternalLog(record);

            // Internal errors are reported to the host console conditionally based
            // on the verbosity level.
            var verbosity = this.verbosity();
            if (verbosity === 0) {
                return;
            }

            // Error messages are throttled in verbosity === 1 mode
            var now = Date.now();
            if (verbosity === 1) {
                var nextVisible = this._lastVisibleErrorMillis + this._options.error_throttle_millis;
                if (now < nextVisible) {
                    this._skippedVisibleErrors++;
                    return;
                }
                if (this._skippedVisibleErrors > 0) {
                    /* eslint-disable max-len */
                    var s = this._skippedVisibleErrors + ' errors masked since last logged error. Increase \'verbosity\' option to see all errors.';
                    /* eslint-enable max-len */
                    this._printToConsole('error', '[LightStep:ERROR] ' + s, payload);
                }
            }

            this._printToConsole('error', '[LightStep:ERROR] ' + msg, payload);
            this._lastVisibleErrorMillis = now;
            this._skippedVisibleErrors = 0;
        }
    }, {
        key: '_printToConsole',
        value: function _printToConsole(type, msg, payload) {
            // Internal option to silence intentional errors generated by the unit
            // tests.
            if (this._options.silent) {
                return;
            }

            if (payload !== undefined) {
                console[type](msg, payload); // eslint-disable-line no-console
            } else {
                console[type](msg); // eslint-disable-line no-console
            }
        }
    }, {
        key: '_pushInternalLog',
        value: function _pushInternalLog(record) {
            if (!record) {
                return;
            }
            if (this._internalLogs.length >= MAX_INTERNAL_LOGS) {
                record.message = 'MAX_INTERNAL_LOGS limit hit. Last error: ' + record.message;
                this._internalLogs[this._internalLogs.length - 1] = record;
            } else {
                this._internalLogs.push(record);
            }
        }
    }]);

    return Tracer;
}(opentracing.Tracer);

exports.default = Tracer;
module.exports = exports['default'];

//# sourceMappingURL=tracer_imp.js.map