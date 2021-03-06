'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
                } else {
                    this._reportAsyncScript(auth, _report, done);
                }
            } catch (e) {
                return done(e, null);
            }
        }
    }, {
        key: '_reportAJAX',
        value: function _reportAJAX(auth, report, done) {
            var payload = JSON.stringify(report.toThrift());
            var protocol = this._encryption === 'none' ? 'http' : 'https';
            var url = protocol + '://' + this._host + ':' + this._port + this._path + '/api/v0/reports';
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            // Note: the browser automatically sets 'Connection' and 'Content-Length'
            // and *does not* allow they to be set manually
            xhr.setRequestHeader('LightStep-Access-Token', auth.getAccessToken());
            xhr.setRequestHeader('Content-Type', 'application/json');
            //req.setRequestHeader('Content-Encoding', 'gzip');
            xhr.onreadystatechange = function () {
                if (this.readyState === 4) {
                    var err = null;
                    var resp = null;
                    if (this.status !== 200) {
                        err = new Error('status code = ' + this.status);
                    } else if (!this.responseText) {
                        err = new Error('unexpected empty response');
                    } else {
                        try {
                            resp = JSON.parse(this.responseText);
                        } catch (exception) {
                            err = exception;
                        }
                    }
                    return done(err, resp);
                }
            };
            xhr.send(payload);
        }

        // Do a "tail flush" using an async browser script load.  This does not get
        // interrupted as a normal Thirft RPC would when navigating away from
        // the page.

    }, {
        key: '_reportAsyncScript',
        value: function _reportAsyncScript(auth, report, done) {
            var authJSON = JSON.stringify(auth.toThrift());
            var reportJSON = JSON.stringify(report.toThrift());
            var protocol = this._encryption === 'none' ? 'http' : 'https';
            var url = protocol + '://' + this._host + ':' + this._port + this._path + '/_rpc/v1/reports/uri_encoded' + ('?auth=' + encodeURIComponent(authJSON)) + ('&report=' + encodeURIComponent(reportJSON));

            var elem = document.createElement('script');
            elem.async = true;
            elem.defer = true;
            elem.src = url;
            elem.type = 'text/javascript';

            var hostElem = document.getElementsByTagName('head')[0];
            if (hostElem) {
                hostElem.appendChild(elem);
            }
            return done(null, null);
        }
    }]);

    return TransportBrowser;
}();

exports.default = TransportBrowser;
module.exports = exports['default'];

//# sourceMappingURL=transport_httpthrift.js.map