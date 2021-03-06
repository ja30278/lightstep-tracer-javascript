'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var proto = require('../../generated_proto/collector_pb.js');

var TransportBrowser = function () {
    function TransportBrowser() {
        _classCallCheck(this, TransportBrowser);

        this._host = '';
        this._port = 0;
        this._path = '';
        this._encryption = '';
    }

    _createClass(TransportBrowser, [{
        key: 'ensureConnection',
        value: function ensureConnection(opts) {
            this._host = opts.collector_host;
            this._port = opts.collector_port;
            this._path = opts.collector_path;
            this._encryption = opts.collector_encryption;
        }
    }, {
        key: 'report',
        value: function report(detached, auth, _report, done) {
            try {
                if (!detached) {
                    this._reportAJAX(auth, _report, done);
                }
            } catch (e) {
                return done(e, null);
            }
        }
    }, {
        key: '_reportAJAX',
        value: function _reportAJAX(auth, report, done) {
            var reportProto = report.toProto(auth);
            var protocol = this._encryption === 'none' ? 'http' : 'https';
            var url = protocol + '://' + this._host + ':' + this._port + this._path + '/api/v2/reports';
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            xhr.open('POST', url);
            // Note: the browser automatically sets 'Connection' and 'Content-Length'
            // and *does not* allow they to be set manually
            xhr.setRequestHeader('Accept', 'application/octet-stream');
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.onreadystatechange = function () {
                if (this.readyState === 4) {
                    var err = null;
                    var resp = null;
                    if (this.status !== 200) {
                        err = new Error('status code = ' + this.status);
                    } else if (!this.response) {
                        err = new Error('unexpected empty response');
                    } else {
                        try {
                            resp = proto.ReportResponse.deserializeBinary(this.response);
                        } catch (exception) {
                            err = exception;
                        }
                    }
                    var jsonResp = {
                        timing: {
                            receive_micros: resp.getReceiveTimestamp(),
                            transmit_micros: resp.getTransmitTimestamp()
                        },
                        errors: resp.errors
                    };
                    return done(err, jsonResp);
                }
            };
            var serialized = reportProto.serializeBinary();
            xhr.send(serialized);
        }
    }]);

    return TransportBrowser;
}();

exports.default = TransportBrowser;
module.exports = exports['default'];

//# sourceMappingURL=transport_httpproto.js.map