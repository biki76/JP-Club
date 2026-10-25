/* js/data-loader.js
 * Fetches, caches, and validates lesson data.
 *
 * Config (set BEFORE this script runs):
 *   window.DATA_BASE             default 'data/lessons/'
 *   window.DATALOADER_VALIDATE   default true; set false to skip checks
 *   window.DATALOADER_STRICT     default false; true = throw on invalid
 */
(function (root) {
  'use strict';

  const cache = new Map();

  function base()           { return root.DATA_BASE || 'data/lessons/'; }
  function shouldValidate() { return typeof root.DATALOADER_VALIDATE === 'boolean' ? root.DATALOADER_VALIDATE : true; }
  function isStrict()       { return root.DATALOADER_STRICT === true; }

  async function fetchJson(url) {
    if (cache.has(url)) return cache.get(url);
    const p = (async () => {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`[DataLoader] HTTP ${res.status} for ${url}`);
      return res.json();
    })();
    cache.set(url, p);
    try { return await p; }
    catch (e) { cache.delete(url); throw e; }
  }

  function check(kind, data, url) {
    if (!shouldValidate()) return data;
    const schemas = root.NihongoSchemas;
    if (!schemas) {
      console.warn('[DataLoader] NihongoSchemas not loaded — skipping validation');
      return data;
    }
    const schema = schemas.schemas[kind];
    if (!schema) return data;

    const isCollection = kind === 'vocabulary' || kind === 'grammar' || kind === 'kanji';
    const result = isCollection
      ? schemas.validateCollection(data, schema, url)
      : schemas.validate(data, schema, url, []);

    if (!result.valid) {
      console.error(`[DataLoader] ✗ ${url}`, result.errors);
      if (isStrict()) {
        const err = new Error(`[DataLoader] Validation failed for ${url}`);
        err.details = result.errors;
        throw err;
      }
    }
    return data;
  }

  async function loadIndex() {
    const url = base() + 'index.json';
    return check('index', await fetchJson(url), url);
  }

  async function loadManifest(relativePath) {
    const url = base() + relativePath;
    return check('manifest', await fetchJson(url), url);
  }

  async function loadLesson(slug) {
    const manifestUrl = `${base()}${slug}/manifest.json`;
    const manifest = check('manifest', await fetchJson(manifestUrl), manifestUrl);
    const df = manifest.dataFiles || {};

    const fetchOne = async (kind, rel) => {
      if (!rel) return [];
      const url = `${base()}${slug}/${rel}`;
      return check(kind, await fetchJson(url), url);
    };

    const [vocabulary, grammar, kanji] = await Promise.all([
      fetchOne('vocabulary', df.vocabulary),
      fetchOne('grammar',    df.grammar),
      fetchOne('kanji',      df.kanji)
    ]);

    return { slug, manifest, vocabulary, grammar, kanji };
  }

  async function loadCourse() {
    const index = await loadIndex();
    const lessons = await Promise.all(
      index.manifests.map(p =>
        loadManifest(p).catch(e => { console.error(e); return null; })
      )
    );
    return { courseId: index.courseId, lessons: lessons.filter(Boolean) };
  }

  function clearCache() { cache.clear(); }

  root.DataLoader = {
    loadIndex,
    loadManifest,
    loadLesson,
    loadCourse,
    clearCache,
    get BASE() { return base(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
