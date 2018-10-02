"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _each;
// Underscore.js-like wrapper to iterate object key-values. Note that even for completely
// internal objects, packages may modify default Object prototypes and properties
// (e.g. Ember.js) so it's almost never safe to assume a particular object can
// iterated with for-in.
function _each(obj, cb) {
    if (!obj) {
        return;
    }
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) {
            cb(obj[key], key);
        }
    }
}
module.exports = exports['default'];

//# sourceMappingURL=_each.js.map