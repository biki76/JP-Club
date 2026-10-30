/* js/data-schemas.js
 * UMD — usable from <script> (window.NihongoSchemas) and from Node (require).
 * Single source of truth for the data contracts. Do not import raw hex/strings;
 * validate against these schemas before trusting data.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NihongoSchemas = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ── Primitives ─────────────────────────────────────── */
  const nonEmptyString = { type: 'string', minLength: 1 };
  const stringArray    = { type: 'array', items: nonEmptyString, uniqueItems: true };
  const bilingual      = { type: 'bilingual' };
  const bilingualArray = { type: 'bilingual-array' };
  const jlptLevel      = { type: 'string', enum: ['N5', 'N4', 'N3', 'N2', 'N1'] };

  /* ── Vocabulary entry ───────────────────────────────── */
  const vocabulary = {
    type: 'object',
    required: ['id', 'furigana', 'english_meaning', 'bengali_meaning'],
    properties: {
      id:              nonEmptyString,
      kanji:           { type: 'string' },   // may be omitted for kana-only words
      furigana:        nonEmptyString,       // reading in kana
      romaji:          { type: 'string' },
      english_meaning: nonEmptyString,
      bengali_meaning: nonEmptyString,
      audio_url:       { type: 'string' },
      tags:            stringArray
    },
    additionalProperties: false
  };

  /* ── Grammar entry ──────────────────────────────────── */
  const grammarExample = {
    type: 'object',
    required: ['jp', 'en', 'bn'],
    properties: {
      jp:       nonEmptyString,
      furigana: { type: 'string' },
      romaji:   { type: 'string' },
      en:       nonEmptyString,
      bn:       nonEmptyString
    },
    additionalProperties: false
  };

  const grammar = {
    type: 'object',
    required: ['id', 'pattern', 'meaning_en', 'meaning_bn', 'examples'],
    properties: {
      id:         nonEmptyString,
      pattern:    nonEmptyString,
      meaning_en: nonEmptyString,
      meaning_bn: nonEmptyString,
      examples:   { type: 'array', items: grammarExample, minItems: 1 },
      notes:      bilingual,
      tags:       stringArray
    },
    additionalProperties: false
  };

  /* ── Kanji entry ────────────────────────────────────── */
  const kanji = {
    type: 'object',
    required: ['character', 'onyomi', 'kunyomi', 'meanings', 'radicals', 'strokes'],
    properties: {
      character: { type: 'string', minLength: 1, maxLength: 4 },
      onyomi:    stringArray,
      kunyomi:   stringArray,
      meanings:  bilingualArray,
      radicals:  stringArray,
      strokes:   { type: 'number', integer: true, min: 1, max: 64 },
      grade:     { type: 'number', integer: true, min: 1, max: 9 },
      jlpt:      jlptLevel
    },
    additionalProperties: false
  };

  /* ── Lesson manifest ────────────────────────────────── */
  const manifest = {
    type: 'object',
    required: ['slug', 'courseId', 'lessonNumber', 'title', 'dataFiles'],
    properties: {
      slug:         { type: 'string', pattern: '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' },
      courseId:     nonEmptyString,
      lessonNumber: { type: 'number', integer: true, min: 1 },
      title:        bilingual,
      subtitle:     bilingual,
      jlpt:         jlptLevel,
      durationMin:  { type: 'number', min: 1 },
      dataFiles: {
        type: 'object',
        required: [],
        properties: {
          vocabulary: nonEmptyString,
          grammar:    nonEmptyString,
          kanji:      nonEmptyString
        },
        additionalProperties: false
      },
      tags: stringArray
    },
    additionalProperties: false
  };

  /* ── Lesson index ───────────────────────────────────── */
  const index = {
    type: 'object',
    required: ['courseId', 'manifests'],
    properties: {
      courseId:  nonEmptyString,
      totalLessons: { type: 'integer', minimum: 0 },
      manifests: { type: 'array', items: nonEmptyString, minItems: 0 }
    },
    additionalProperties: false
  };

  /* ── Validator (recursive, dependency-free) ─────────── */
  function validate(value, schema, path, errors) {
    path = path || '$';
    errors = errors || [];
    if (schema == null) return { valid: true, errors };

    if (value === null || value === undefined) {
      errors.push({ path, message: 'is required' });
      return { valid: false, errors };
    }

    const t = schema.type;

    if (t === 'string') {
      if (typeof value !== 'string') {
        errors.push({ path, message: `expected string, got ${typeof value}` });
        return { valid: false, errors };
      }
      if (schema.minLength != null && value.length < schema.minLength)
        errors.push({ path, message: `length ${value.length} < ${schema.minLength}` });
      if (schema.maxLength != null && value.length > schema.maxLength)
        errors.push({ path, message: `length ${value.length} > ${schema.maxLength}` });
      if (schema.pattern && !new RegExp(schema.pattern).test(value))
        errors.push({ path, message: `does not match /${schema.pattern}/` });
      if (schema.enum && !schema.enum.includes(value))
        errors.push({ path, message: `must be one of: ${schema.enum.join(', ')}` });
    }

    else if (t === 'number' || t === 'integer') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push({ path, message: `expected number, got ${typeof value}` });
        return { valid: false, errors };
      }
      if (t === 'integer' && !Number.isInteger(value))
        errors.push({ path, message: 'expected integer' });
      if (schema.min != null && value < schema.min)
        errors.push({ path, message: `${value} < ${schema.min}` });
      if (schema.max != null && value > schema.max)
        errors.push({ path, message: `${value} > ${schema.max}` });
    }

    else if (t === 'boolean') {
      if (typeof value !== 'boolean')
        errors.push({ path, message: `expected boolean, got ${typeof value}` });
    }

    else if (t === 'array') {
      if (!Array.isArray(value)) {
        errors.push({ path, message: `expected array, got ${typeof value}` });
        return { valid: false, errors };
      }
      if (schema.minItems != null && value.length < schema.minItems)
        errors.push({ path, message: `needs ≥ ${schema.minItems} items, has ${value.length}` });
      if (schema.maxItems != null && value.length > schema.maxItems)
        errors.push({ path, message: `needs ≤ ${schema.maxItems} items, has ${value.length}` });
      if (schema.uniqueItems) {
        const seen = new Set();
        value.forEach((v, i) => {
          const k = JSON.stringify(v);
          if (seen.has(k)) errors.push({ path: `${path}[${i}]`, message: 'duplicate item' });
          seen.add(k);
        });
      }
      if (schema.items)
        value.forEach((v, i) => validate(v, schema.items, `${path}[${i}]`, errors));
    }

    else if (t === 'object') {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({ path, message: `expected object, got ${Array.isArray(value) ? 'array' : typeof value}` });
        return { valid: false, errors };
      }
      (schema.required || []).forEach(k => {
        if (!(k in value)) errors.push({ path: `${path}.${k}`, message: 'is required' });
      });
      const props = schema.properties || {};
      Object.keys(value).forEach(k => {
        if (props[k]) validate(value[k], props[k], `${path}.${k}`, errors);
        else if (schema.additionalProperties === false)
          errors.push({ path: `${path}.${k}`, message: 'unknown property' });
      });
    }

    else if (t === 'bilingual') {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({ path, message: 'expected { en, bn } object' });
        return { valid: false, errors };
      }
      ['en', 'bn'].forEach(k => {
        if (typeof value[k] !== 'string' || value[k].length === 0)
          errors.push({ path: `${path}.${k}`, message: 'expected non-empty string' });
      });
    }

    else if (t === 'bilingual-array') {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({ path, message: 'expected { en: [], bn: [] } object' });
        return { valid: false, errors };
      }
      ['en', 'bn'].forEach(k => {
        if (!Array.isArray(value[k]))
          errors.push({ path: `${path}.${k}`, message: 'expected array' });
        else if (!value[k].every(s => typeof s === 'string' && s.length > 0))
          errors.push({ path: `${path}.${k}`, message: 'expected non-empty strings' });
      });
    }

    return { valid: errors.length === 0, errors };
  }

  function validateCollection(collection, itemSchema, path) {
    path = path || '$';
    const errors = [];
    if (!Array.isArray(collection)) {
      errors.push({ path, message: 'expected array' });
      return { valid: false, errors };
    }
    collection.forEach((item, i) => validate(item, itemSchema, `${path}[${i}]`, errors));
    const ids = new Set();
    collection.forEach((item, i) => {
      if (item && typeof item.id === 'string') {
        if (ids.has(item.id))
          errors.push({ path: `${path}[${i}].id`, message: `duplicate id "${item.id}"` });
        ids.add(item.id);
      }
    });
    return { valid: errors.length === 0, errors };
  }

  return {
    schemas: { vocabulary, grammar, kanji, manifest, index },
    validate,
    validateCollection
  };
});
