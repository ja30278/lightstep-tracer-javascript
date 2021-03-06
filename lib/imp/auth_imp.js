'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _platform_abstraction_layer = require('../platform_abstraction_layer');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// eslint-disable-line camelcase
var proto = require('./generated_proto/collector_pb.js');

var AuthImp = function () {
    function AuthImp(accessToken) {
        _classCallCheck(this, AuthImp);

        this._accessToken = accessToken;
    }

    _createClass(AuthImp, [{
        key: 'getAccessToken',
        value: function getAccessToken() {
            return this._accessToken;
        }
    }, {
        key: 'toThrift',
        value: function toThrift() {
            return new _platform_abstraction_layer.crouton_thrift.Auth({
                access_token: this._accessToken
            });
        }
    }, {
        key: 'toProto',
        value: function toProto() {
            var authProto = new proto.Auth();
            authProto.setAccessToken(this._accessToken);
            return authProto;
        }
    }]);

    return AuthImp;
}();

exports.default = AuthImp;
module.exports = exports['default'];

//# sourceMappingURL=auth_imp.js.map