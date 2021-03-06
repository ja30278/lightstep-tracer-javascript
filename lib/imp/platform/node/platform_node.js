'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var os = require('os');
var _each = require('../../../_each.js');

function computeStartMicros() {
    var startTimeMs = Date.now();
    var startHrTime = process.hrtime();
    var baseHrMicros = startHrTime[0] * 1000000.0 + startHrTime[1] / 1000.0;

    var startTimeMicros = startTimeMs * 1000.0 - baseHrMicros;
    return startTimeMicros;
}

var startTimeMicros = computeStartMicros();

// Local storage for Node is just memory
var gLocalStorage = {};

var PlatformNode = function () {
    function PlatformNode(imp) {
        _classCallCheck(this, PlatformNode);

        this._mustMatchVersion();
    }

    // An explicit runtime version check. The package.json cannot enforce the
    // runtime version requirement in all circumstances.  See:
    // http://www.marcusoft.net/2015/03/packagejson-and-engines-and-enginestrict.html
    //
    // Note: consider using the semver package if the logic in this function
    // gets any more complex.


    _createClass(PlatformNode, [{
        key: '_mustMatchVersion',
        value: function _mustMatchVersion() {
            var actualMatch = /^v(\d+)\.(\d+)\.(\d+)$/.exec(process.version);
            if (!actualMatch || actualMatch.length !== 4) {
                // The version string did not match the expected pattern;
                // optimistically assume this is fine.
                return;
            }

            var packageObject = require('../../../../package.json');
            var requiredVersionString = packageObject.engines.node;
            var requiredMatch = /^>=(\d+)\.(\d+)\.(\d+)$/.exec(requiredVersionString);
            if (!requiredMatch || requiredMatch.length !== 4) {
                throw new Error('Internal error: package.json node requirement malformed');
            }

            var err = 'Fatal Error: insufficient node version. Requires node ' + requiredVersionString;
            try {
                var actual = [parseInt(actualMatch[0], 10), parseInt(actualMatch[1], 10), parseInt(actualMatch[2], 10)];
                var required = [parseInt(requiredMatch[0], 10), parseInt(requiredMatch[1], 10), parseInt(requiredMatch[2], 10)];
                if (actual[0] > required[0]) {
                    return;
                } else if (actual[0] < required[0]) {
                    this.fatal(err);
                } else if (actual[1] > required[1]) {
                    return;
                } else if (actual[1] < required[1]) {
                    this.fatal(err);
                } else if (actual[2] < required[2]) {
                    this.fatal(err);
                }
            } catch (e) {
                // Optimistically ignore the unexpected version format and keep
                // going.
            }
        }
    }, {
        key: 'name',
        value: function name() {
            return 'node';
        }
    }, {
        key: 'nowMicros',
        value: function nowMicros() {
            var hrTime = process.hrtime();
            return Math.floor(startTimeMicros + hrTime[0] * 1000000.0 + hrTime[1] / 1000.0);
        }
    }, {
        key: 'runtimeGUID',
        value: function runtimeGUID(groupName) {
            return this.generateUUID();
        }
    }, {
        key: 'generateUUID',
        value: function generateUUID() {
            var p0 = ('00000000' + Math.abs(Math.random() * 0xFFFFFFFF | 0).toString(16)).substr(-8);
            var p1 = ('00000000' + Math.abs(Math.random() * 0xFFFFFFFF | 0).toString(16)).substr(-8);
            return '' + p0 + p1;
        }
    }, {
        key: 'onBeforeExit',
        value: function onBeforeExit() {
            var _process;

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            (_process = process).on.apply(_process, ['beforeExit'].concat(args));
        }
    }, {
        key: 'plugins',
        value: function plugins() {
            return [];
        }
    }, {
        key: 'options',
        value: function options() {
            if (!(process && process.argv)) {
                return;
            }
            var opts = {};
            _each(process.argv, function (value, key) {
                // Keep the argument "parsing" simple.  These are primarily debug
                // options regardless.
                switch (value.toLowerCase()) {
                    case '--lightstep-log_to_console':
                    case '--lightstep-log_to_console=true':
                    case '--lightstep-log_to_console=1':
                        opts.log_to_console = true;
                        break;
                    case '--lightstep-verbosity=5':
                        opts.verbosity = 5;
                        break;
                    case '--lightstep-verbosity=4':
                        opts.verbosity = 4;
                        break;
                    case '--lightstep-verbosity=3':
                        opts.verbosity = 3;
                        break;
                    case '--lightstep-verbosity=2':
                        opts.verbosity = 2;
                        break;
                    case '--lightstep-verbosity=1':
                        opts.verbosity = 1;
                        break;
                    default:
                        // Ignore
                        break;
                }
            });
            return opts;
        }
    }, {
        key: 'tracerTags',
        value: function tracerTags() {
            var tags = {
                'lightstep.tracer_platform': 'node',
                'lightstep.tracer_platform_version': process.version,
                'lightstep.node_platform': process.platform,
                'lightstep.node_arch': process.arch,
                'lightstep.hostname': os.hostname()
            };
            if (process.argv) {
                tags['lightstep.command_line'] = process.argv.join(' ');
            }
            if (process.execArgv && process.execArgv.length > 0) {
                tags['lightstep.node_arguments'] = process.execArgv.join(' ');
            }

            return tags;
        }
    }, {
        key: 'fatal',
        value: function fatal(message) {
            console.error(message); // eslint-disable-line no-console
            process.exit(1);
        }
    }, {
        key: 'localStoreGet',
        value: function localStoreGet(key) {
            return gLocalStorage[key];
        }
    }, {
        key: 'localStoreSet',
        value: function localStoreSet(key, value) {
            gLocalStorage[key] = value;
        }
    }], [{
        key: 'initLibrary',
        value: function initLibrary(lib) {}
    }]);

    return PlatformNode;
}();

exports.default = PlatformNode;
module.exports = exports['default'];

//# sourceMappingURL=platform_node.js.map