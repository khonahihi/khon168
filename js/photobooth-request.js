/* KHON168 Photobooth request bridge — prototype / opt-in only.
 * Shadowrocket HTTP request hook. This does NOT change Locket's UI or add a camera button.
 * Replace BACKEND_URL before enabling. Not a verified live Locket API adapter.
 */
(function () {
  var BACKEND_URL = 'https://khon-photobooth.onrender.com';
  var STATE_KEY = 'khon168.pb.active.v1';
  var ALIASES = {
    photobooth_4cut: 1, frame_classic_pb: 1, pb_vintage: 1,
    photobooth_cute: 1, pb_strawberry: 1, frame_berry_days: 1, frame_happy_snap: 1,
    pb_holo_4cut: 1, pb_galaxy: 1, pb_denim_ripped_2x2: 1,
    back_to_school: 1, frame_sky_diary: 1, pb_scrapbook_ripped_4cut: 1, pb_ripped_paper_4cut: 1
  };
  function read(key) {
    try {
      if (typeof $persistentStore !== 'undefined') return $persistentStore.read(key);
      if (typeof $prefs !== 'undefined') return $prefs.valueForKey(key);
    } catch (_) {}
    return null;
  }
  function write(key, val) {
    try {
      if (typeof $persistentStore !== 'undefined') return $persistentStore.write(val, key);
      if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(val, key);
    } catch (_) {}
  }
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.floor(Math.random() * 16);
      return (c === 'x' ? r : ((r & 3) | 8)).toString(16);
    });
  }
  function pickFilter(obj) {
    var values = [obj.filterId, obj.filter_id, obj.filter, obj.effectId, obj.effect_id,
      obj.data && obj.data.filterId, obj.data && obj.data.filter_id,
      obj.options && obj.options.filterId, obj.options && obj.options.filter_id];
    for (var i = 0; i < values.length; i++) {
      if (typeof values[i] === 'string' && values[i]) return values[i].toLowerCase();
    }
    return '';
  }
  function run() {
    if (typeof $request === 'undefined' || !$request || typeof $request.body !== 'string') return $done({});
    if (BACKEND_URL.indexOf('YOUR-BACKEND-DOMAIN') !== -1) return $done({}); // fail safe
    var data;
    try { data = JSON.parse($request.body); } catch (_) { return $done({}); }
    var filter = pickFilter(data);
    if (!ALIASES[filter]) return $done({});
    var now = Date.now();
    var active;
    try { active = JSON.parse(read(STATE_KEY) || '{}'); } catch (_) { active = {}; }
    if (!active.session || active.filter !== filter || now - Number(active.lastAt || 0) > 10 * 60 * 1000) {
      active = { session: uuid(), filter: filter, lastAt: now };
    }
    active.lastAt = now;
    write(STATE_KEY, JSON.stringify(active));

    // Do not forward Locket cookies, authorization or device identifiers to a backend.
    // A real production deployment needs per-user authentication and rate limiting.
    var headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-KHON168-Session': active.session,
      'X-KHON168-Frame': filter
    };
    return $done({
      url: BACKEND_URL.replace(/\/$/, '') + '/generateFilteredImage',
      headers: headers,
      body: $request.body
    });
  }
  try { run(); } catch (_) { $done({}); }
})();
