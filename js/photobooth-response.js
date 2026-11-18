/* KHON168 response hook: reset the local flow only if our backend says complete.
 * Does NOT fabricate success codes or hide upstream errors.
 * Response interception after a request URL change depends on Shadowrocket version/config.
 */
(function () {
  var KEY = 'khon168.pb.active.v1';
  function save(val) {
    try {
      if (typeof $persistentStore !== 'undefined') return $persistentStore.write(val, KEY);
      if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(val, KEY);
    } catch (_) {}
  }
  try {
    if (!$response || !$response.body) return $done({});
    var body = JSON.parse($response.body);
    if (body && body.success === true && body.complete === true && body.sessionId) save('');
  } catch (_) {}
  $done({});
})();
