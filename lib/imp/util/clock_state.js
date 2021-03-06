'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _each2 = require('../../_each');

var _each3 = _interopRequireDefault(_each2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// How many updates before a sample is considered old. This happens to
// be one less than the number of samples in our buffer but that's
// somewhat arbitrary.
var kMaxOffsetAge = 7;

var kStoredSamplesTTLMicros = 60 * 60 * 1000 * 1000; // 1 hour

var ClockState = function () {
    function ClockState(opts) {
        _classCallCheck(this, ClockState);

        this._nowMicros = opts.nowMicros;
        this._localStoreGet = opts.localStoreGet;
        this._localStoreSet = opts.localStoreSet;

        // The last eight samples, computed from timing information in
        // RPCs.
        this._samples = [];
        this._currentOffsetMicros = 0;

        // How many updates since we've updated currentOffsetMicros.
        this._currentOffsetAge = kMaxOffsetAge + 1;

        // Try to load samples from the local store.
        // Only use the data if it's recent.
        var storedData = this._localStoreGet();
        if (storedData && storedData.timestamp_micros && storedData.timestamp_micros > this._nowMicros() - kStoredSamplesTTLMicros) {
            // Make sure there are no more than (kMaxOffsetAge+1) elements
            this._samples = storedData.samples.slice(-(kMaxOffsetAge + 1));
        }
        // Update the current offset based on these data.
        this.update();
    }

    // Add a new timing sample and update the offset.


    _createClass(ClockState, [{
        key: 'addSample',
        value: function addSample(originMicros, receiveMicros, transmitMicros, destinationMicros) {
            var latestDelayMicros = Number.MAX_VALUE;
            var latestOffsetMicros = 0;
            // Ensure that all of the data are valid before using them. If
            // not, we'll push a {0, MAX} record into the queue.
            if (originMicros > 0 && receiveMicros > 0 && transmitMicros > 0 && destinationMicros > 0) {
                latestDelayMicros = destinationMicros - originMicros - (transmitMicros - receiveMicros);
                latestOffsetMicros = (receiveMicros - originMicros + (transmitMicros - destinationMicros)) / 2;
            }

            // Discard the oldest sample and push the new one.
            if (this._samples.length === kMaxOffsetAge + 1) {
                this._samples.shift();
            }
            this._samples.push({
                delayMicros: latestDelayMicros,
                offsetMicros: latestOffsetMicros
            });
            this._currentOffsetAge++;

            // Update the local store with this new sample.
            this._localStoreSet({
                timestamp_micros: this._nowMicros(),
                samples: this._samples
            });
            this.update();
        }

        // Update the time offset based on the current samples.

    }, {
        key: 'update',
        value: function update() {
            // This is simplified version of the clock filtering in Simple
            // NTP. It ignores precision and dispersion (frequency error). In
            // brief, it keeps the 8 (kMaxOffsetAge+1) most recent
            // delay-offset pairs, and considers the offset with the smallest
            // delay to be the best one. However, it only uses this new offset
            // if the change (relative to the last offset) is small compared
            // to the estimated error.
            //
            // See:
            // https://tools.ietf.org/html/rfc5905#appendix-A.5.2
            // http://books.google.com/books?id=pdTcJBfnbq8C
            //   esp. section 3.5
            // http://www.eecis.udel.edu/~mills/ntp/html/filter.html
            // http://www.eecis.udel.edu/~mills/database/brief/algor/algor.pdf
            // http://www.eecis.udel.edu/~mills/ntp/html/stats.html

            // TODO: Consider huff-n'-puff if the delays are highly asymmetric.
            // http://www.eecis.udel.edu/~mills/ntp/html/huffpuff.html

            // Find the sample with the smallest delay; the corresponding
            // offset is the "best" one.
            var minDelayMicros = Number.MAX_VALUE;
            var bestOffsetMicros = 0;
            (0, _each3.default)(this._samples, function (sample) {
                if (sample.delayMicros < minDelayMicros) {
                    minDelayMicros = sample.delayMicros;
                    bestOffsetMicros = sample.offsetMicros;
                }
            });

            // No update.
            if (bestOffsetMicros === this._currentOffsetMicros) {
                return;
            }

            // Now compute the jitter, i.e. the error relative to the new
            // offset were we to use it.
            var jitter = 0;
            (0, _each3.default)(this._samples, function (sample) {
                jitter += Math.pow(bestOffsetMicros - sample.offsetMicros, 2);
            });
            jitter = Math.sqrt(jitter / this._samples.length);

            // Ignore spikes: only use the new offset if the change is not too
            // large... unless the current offset is too old. The "too old"
            // condition is also triggered when update() is called from the
            // constructor.
            var kSGATE = 3; // See RFC 5905
            if (this._currentOffsetAge > kMaxOffsetAge || Math.abs(this._currentOffsetMicros - bestOffsetMicros) < kSGATE * jitter) {
                this._currentOffsetMicros = bestOffsetMicros;
                this._currentOffsetAge = 0;
            }
        }

        // Returns the difference in microseconds between the server's clock
        // and our clock. This should be added to any local timestamps before
        // sending them to the server. Note that a negative offset means that
        // the local clock is ahead of the server's.

    }, {
        key: 'offsetMicros',
        value: function offsetMicros() {
            return Math.floor(this._currentOffsetMicros);
        }

        // Returns true if we've performed enough measurements to be confident
        // in the current offset.

    }, {
        key: 'isReady',
        value: function isReady() {
            return this._samples.length > 3;
        }
    }, {
        key: 'activeSampleCount',
        value: function activeSampleCount() {
            return this._samples.length;
        }
    }]);

    return ClockState;
}();

module.exports = ClockState;

//# sourceMappingURL=clock_state.js.map