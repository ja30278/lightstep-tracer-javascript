"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Util = function () {
    function Util() {
        _classCallCheck(this, Util);
    }

    _createClass(Util, [{
        key: "detachedTimeout",


        // Similar to a regular setTimeout() call, but dereferences the timer so the
        // program execution will not be held up by this timer.
        value: function detachedTimeout(callback, delay) {
            var timer = setTimeout(callback, delay);
            if (timer.unref) {
                timer.unref();
            }
            return timer;
        }
    }]);

    return Util;
}();

exports.default = new Util();
module.exports = exports['default'];

//# sourceMappingURL=util.js.map