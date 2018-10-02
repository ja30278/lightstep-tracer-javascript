'use strict';

var _tracer_imp = require('./imp/tracer_imp');

var _tracer_imp2 = _interopRequireDefault(_tracer_imp);

var _platform_abstraction_layer = require('./platform_abstraction_layer');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var library = {
    Tracer: _tracer_imp2.default
};

_platform_abstraction_layer.Platform.initLibrary(library);
module.exports = library;

//# sourceMappingURL=lib.js.map