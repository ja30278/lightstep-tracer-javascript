'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _https = require('https');

var https = _interopRequireWildcard(_https);

var _http = require('http');

var http = _interopRequireWildcard(_http);

var _zlib = require('zlib');

var zlib = _interopRequireWildcard(_zlib);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var kMaxDetailedErrorFrequencyMs = 30000;
var kMaxStringLength = 2048;

function truncatedString(s) {
    if (!s || s.length <= kMaxStringLength) {
        return s;
    }
    var half = Math.floor(kMaxStringLength / 2);
    return s.substr(0, half) + '...' + s.substr(-half);
}

function encodeAndTruncate(obj) {
    try {
        return truncatedString(JSON.stringify(obj.toThrift()));
    } catch (exception) {
        return exception;
    }
}

function errorFromResponse(res, buffer) {
    if (buffer && buffer.length) {
        buffer = truncatedString(('' + buffer).replace(/\s+$/, ''));
    }
    return new Error('status code=' + res.statusCode + ', message=\'' + res.statusMessage + '\', body=\'' + buffer + '\'');
}

var TransportHTTPThrift = function () {
    function TransportHTTPThrift(logger) {
        _classCallCheck(this, TransportHTTPThrift);

        this._host = '';
        this._port = 0;
        this._encryption = '';
        this._timeoutMs = 0;

        this._logger = logger;
        this._lastLogMs = 0;
    }

    _createClass(TransportHTTPThrift, [{
        key: 'ensureConnection',
        value: function ensureConnection(opts) {
            this._host = opts.collector_host;
            this._port = opts.collector_port;
            this._encryption = opts.collector_encryption;
            this._timeoutMs = opts.report_timeout_millis;
            this._gzipJSON = opts.gzip_json_requests;
        }
    }, {
        key: '_preparePayload',
        value: function _preparePayload(useGzip, reportRequest, cb) {
            var payload = void 0;
            try {
                payload = JSON.stringify(reportRequest.toThrift());
            } catch (exception) {
                // This should never happen. The library should always be constructing
                // valid reports.
                this._error('Could not JSON.stringify report!');
                return cb(exception);
            }

            if (useGzip) {
                return zlib.gzip(payload, cb);
            }
            return cb(null, payload);
        }
    }, {
        key: 'report',
        value: function report(detached, auth, reportRequest, done) {
            var _this = this;

            var options = {
                hostname: this._host,
                port: this._port,
                method: 'POST',
                path: '/api/v0/reports'
            };
            var protocol = this._encryption === 'none' ? http : https;
            var useGzip = this._gzipJSON;

            this._preparePayload(useGzip, reportRequest, function (payloadErr, payload) {
                if (payloadErr) {
                    _this._error('Error compressing payload');
                    return done(payloadErr);
                }

                var extraErrorData = [];
                var req = protocol.request(options, function (res) {
                    var buffer = '';
                    res.on('data', function (chunk) {
                        buffer += chunk;
                    });
                    res.on('end', function () {
                        var err = null;
                        var resp = null;
                        if (res.statusCode === 400) {
                            _this._throttleLog(function () {
                                _this._warning('transport status code = 400', {
                                    code: res.statusCode,
                                    message: res.statusMessage,
                                    body: buffer,
                                    extra: extraErrorData,
                                    report: encodeAndTruncate(reportRequest)
                                });
                            });
                            err = errorFromResponse(res, buffer);
                        } else if (res.statusCode !== 200) {
                            err = errorFromResponse(res, buffer);
                        } else if (!buffer) {
                            err = new Error('unexpected empty response');
                        } else {
                            try {
                                resp = JSON.parse(buffer);
                            } catch (exception) {
                                err = exception;
                            }
                        }
                        return done(err, resp);
                    });
                });
                req.on('socket', function (socket, head) {
                    socket.setTimeout(_this._timeoutMs);
                    socket.on('timeout', function () {
                        // abort() will generate an error, so done() is called as a
                        // result.
                        req.abort();
                        extraErrorData.push('Request timed out (' + _this._timeoutMs + ' ms)');
                    });
                });
                req.on('error', function (err) {
                    _this._throttleLog(function () {
                        _this._warning('HTTP request error', {
                            error: err,
                            extra: extraErrorData,
                            report: encodeAndTruncate(reportRequest)
                        });
                    });
                    done(err, null);
                });

                req.setHeader('Host', _this._host);
                req.setHeader('User-Agent', 'LightStep-JavaScript-Node');
                req.setHeader('LightStep-Access-Token', auth.getAccessToken());
                req.setHeader('Content-Type', 'application/json');
                req.setHeader('Content-Length', payload.length);
                if (useGzip) {
                    req.setHeader('Content-Encoding', 'gzip');
                }
                if (!detached) {
                    req.setHeader('Connection', 'keep-alive');
                }
                req.write(payload);
                req.end();
            });
        }
    }, {
        key: '_throttleLog',
        value: function _throttleLog(f) {
            var now = Date.now();
            if (now - this._lastLogMs < kMaxDetailedErrorFrequencyMs) {
                return;
            }
            this._lastLogMs = now;
            f();
        }
    }, {
        key: '_warning',
        value: function _warning(msg, payload) {
            this._logger.warn(msg, payload);
        }
    }, {
        key: '_error',
        value: function _error(msg, payload) {
            this._logger.error(msg, payload);
        }
    }]);

    return TransportHTTPThrift;
}();

exports.default = TransportHTTPThrift;
module.exports = exports['default'];

//# sourceMappingURL=transport_httpthrift.js.map