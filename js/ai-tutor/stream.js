/* js/ai-tutor/stream.js — POST + Server-Sent-Events client with timeouts, retry and cancel.
 * Exposes window.AITutorStream.send(options) → { cancel() , done: Promise }.
 *
 * Retry policy: a request is retried automatically ONLY if it failed before the first
 * server event (network drop, 429/5xx before streaming). Once tokens have been shown, the
 * user decides (Retry button) so a half-finished answer is never silently duplicated.
 */
(function () {
  'use strict';

  var CONNECT_MS = 15000;     // no response headers
  var IDLE_MS = 25000;        // no bytes while streaming
  var BACKOFF = [600, 1600];  // two automatic retries

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function jitter(ms) { return ms + Math.floor(Math.random() * 250); }

  function TutorError(code, message, retryable, status) {
    var e = new Error(message || code);
    e.code = code; e.retryable = !!retryable; e.status = status || 0;
    return e;
  }

  /* Parse "event: x\ndata: {...}\n\n" frames from a fetch body. */
  async function readEvents(res, onEvent, bumpIdle) {
    var reader = res.body.getReader();
    var dec = new TextDecoder();
    var buf = '';
    for (;;) {
      var chunk = await reader.read();
      if (chunk.done) break;
      bumpIdle();
      buf += dec.decode(chunk.value, { stream: true });
      var i;
      while ((i = buf.search(/\r?\n\r?\n/)) !== -1) {
        var block = buf.slice(0, i);
        buf = buf.slice(i + (buf.charAt(i) === '\r' ? 4 : 2));
        var ev = 'message', data = [];
        block.split(/\r?\n/).forEach(function (line) {
          if (line.indexOf('event:') === 0) ev = line.slice(6).trim();
          else if (line.indexOf('data:') === 0) data.push(line.slice(5).replace(/^ /, ''));
        });
        if (!data.length) continue;           // comment / heartbeat
        var payload; try { payload = JSON.parse(data.join('\n')); } catch (e) { continue; }
        onEvent(ev, payload);
      }
    }
  }

  /*
   * options: { url, getToken(forceRefresh) → Promise<string>, apikey, body, onMeta, onDelta, onDone, onAttempt }
   */
  function send(options) {
    var ctl = new AbortController();
    var cancelled = false;

    async function attempt(n, forceRefresh) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw TutorError('offline', 'You are offline.', true, 0);

      var token = await options.getToken(forceRefresh);
      var shown = false, finished = false, serverError = null;
      var idle, connect = setTimeout(function () { ctl.abort(); }, CONNECT_MS);
      function bump() { clearTimeout(idle); idle = setTimeout(function () { ctl.abort(); }, IDLE_MS); }

      try {
        var res;
        try {
          res = await fetch(options.url, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + token,
              'apikey': options.apikey || '',
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream'
            },
            body: JSON.stringify(Object.assign({}, options.body, { stream: true })),
            signal: ctl.signal,
            cache: 'no-store'
          });
        } catch (e) {
          if (cancelled) throw TutorError('cancelled', 'Cancelled', false);
          throw TutorError(navigator.onLine === false ? 'offline' : 'network', 'Network problem.', true, 0);
        }
        clearTimeout(connect);

        if (res.status === 401 && !forceRefresh) return attempt(n, true);   // token expired → refresh once
        if (!res.ok) {
          var j = {}; try { j = await res.json(); } catch (e) {}
          throw TutorError(j.code || ('http_' + res.status), j.message || j.error || ('HTTP ' + res.status),
            res.status === 429 || res.status >= 500, res.status);
        }
        if (!res.body || (res.headers.get('content-type') || '').indexOf('text/event-stream') === -1) {
          var jj = {}; try { jj = await res.json(); } catch (e) {}
          if (jj && jj.success && jj.data) { options.onDone && options.onDone(jj.data); return; }   // server answered in JSON mode
          throw TutorError('bad_response', 'Unexpected response.', true, res.status);
        }

        bump();
        await readEvents(res, function (ev, d) {
          if (ev === 'meta') options.onMeta && options.onMeta(d);
          else if (ev === 'delta') { shown = true; options.onDelta && options.onDelta(d.t || ''); }
          else if (ev === 'done') { finished = true; options.onDone && options.onDone(d); }
          else if (ev === 'error') serverError = d;
        }, bump);
        clearTimeout(idle);

        if (serverError) {
          var err = TutorError(serverError.code || 'server', serverError.message, serverError.retryable, 0);
          err.partial = shown; throw err;
        }
        if (!finished) { var cut = TutorError('stream_interrupted', 'The connection was interrupted.', true, 0); cut.partial = shown; throw cut; }
      } catch (e) {
        clearTimeout(connect); clearTimeout(idle);
        if (cancelled) throw TutorError('cancelled', 'Cancelled', false);
        if (e && e.name === 'AbortError') { e = TutorError(shown ? 'stream_interrupted' : 'timeout', 'The tutor took too long.', true, 0); e.partial = shown; }
        if (!(e && e.code)) { e = TutorError(shown ? 'stream_interrupted' : 'network', shown ? 'The connection was interrupted.' : 'Network problem.', true, 0); e.partial = shown; }
        // automatic retry only before anything was shown to the user
        if (e.retryable && !shown && !e.partial && n < BACKOFF.length && e.code !== 'offline' && e.code !== 'rate_limited') {
          options.onAttempt && options.onAttempt(n + 1);
          await sleep(jitter(BACKOFF[n]));
          if (cancelled) throw TutorError('cancelled', 'Cancelled', false);
          ctl = new AbortController();
          return attempt(n + 1, false);
        }
        throw e;
      }
    }

    return {
      cancel: function () { cancelled = true; try { ctl.abort(); } catch (e) {} },
      done: attempt(0, false)
    };
  }

  window.AITutorStream = { send: send, TutorError: TutorError };
})();
