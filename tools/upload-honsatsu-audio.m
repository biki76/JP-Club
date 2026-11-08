#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const configPath = join(ROOT, 'js/supabase-config.js');

if (!existsSync(configPath)) {
  console.error('❌ CRITICAL: Could not find js/supabase-config.js');
  process.exit(1);
}

const configContent = readFileSync(configPath, 'utf-8');
const urlMatch = configContent.match(/SUPABASE_URL\s*[:=]\s*['"]([^'"]+)['"]/);
const keyMatch = configContent.match(/SUPABASE_ANON_KEY\s*[:=]\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
  console.error('❌ Could not parse Supabase config from js/supabase-config.js');
  process.exit(1);
}

const SUPABASE_URL = urlMatch[1];
const SUPABASE_ANON_KEY = keyMatch[1];
const BUCKET = 'nihongo-audio';

const SOURCE_DIR = process.env.AUDIO_SOURCE_DIR || '/storage/emulated/0/Download/minna-no-nihongo-master';

if (!existsSync(SOURCE_DIR)) {
  console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
  process.exit(1);
}

const TRACK_MAP = {
  1: { category: 'intro', title: 'Japanese Pronunciation — 1. Kana & Mora' },
  2: { category: 'intro', title: 'Japanese Pronunciation — 2. Long Vowels' },
  3: { category: 'intro', title: 'Japanese Pronunciation — 3. The "n" Sound' },
  4: { category: 'intro', title: 'Japanese Pronunciation — 4. Double Consonants' },
  5: { category: 'intro', title: 'Japanese Pronunciation — 5. Contracted Sounds' },
  6: { category: 'intro', title: 'Japanese Pronunciation — 6. Pitch Accent' },
  7: { category: 'intro', title: 'Japanese Pronunciation — 7. Intonation' },
  8: { category: 'intro', title: 'Classroom Commands & Instructions' },
  9: { category: 'intro', title: 'Everyday Greetings & Conversational Expressions' },
  10: { category: 'intro', title: 'Numerals / Counting Numbers' },
  11: { lesson: 'minna-001', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  12: { lesson: 'minna-001', type: 'exercise-c', title: 'Practice Exercises C' },
  13: { lesson: 'minna-001', type: 'conversation', title: 'Conversation: Nice to meet you' },
  14: { lesson: 'minna-002', type: 'sentence-patterns', title: 'Writing Styles and Examples' },
  15: { lesson: 'minna-002', type: 'exercise-c', title: 'Exercise C' },
  16: { lesson: 'minna-002', type: 'conversation', title: 'Conversation: A token of my appreciation' },
  17: { lesson: 'minna-003', type: 'sentence-patterns', title: 'Writing Styles and Examples' },
  18: { lesson: 'minna-003', type: 'exercise-c', title: 'Exercise C' },
  19: { lesson: 'minna-003', type: 'conversation', title: 'Conversation: Give me this one, please' },
  20: { lesson: 'minna-004', type: 'sentence-patterns', title: 'Writing Styles and Examples' },
  21: { lesson: 'minna-004', type: 'exercise-c', title: 'Exercise C' },
  22: { lesson: 'minna-004', type: 'conversation', title: 'Conversation: What time are you open?' },
  23: { lesson: 'minna-005', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  24: { lesson: 'minna-005', type: 'exercise-c', title: 'Exercise C' },
  25: { lesson: 'minna-005', type: 'conversation', title: 'Conversation: Are you going to Koshien?' },
  26: { lesson: 'minna-006', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  27: { lesson: 'minna-006', type: 'exercise-c', title: 'Exercise C' },
  28: { lesson: 'minna-006', type: 'conversation', title: 'Conversation: Won\'t you come with us?' },
  29: { lesson: 'minna-007', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  30: { lesson: 'minna-007', type: 'exercise-c', title: 'Exercise C' },
  31: { lesson: 'minna-007', type: 'conversation', title: 'Conversation: Excuse me, anyone home?' },
  32: { lesson: 'minna-008', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  33: { lesson: 'minna-008', type: 'exercise-c', title: 'Exercise C' },
  34: { lesson: 'minna-008', type: 'conversation', title: 'Conversation: It\'s time I should be leaving' },
  35: { lesson: 'minna-009', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  36: { lesson: 'minna-009', type: 'exercise-c', title: 'Exercise C' },
  37: { lesson: 'minna-009', type: 'conversation', title: 'Conversation: That\'s a pity' },
  38: { lesson: 'minna-010', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  39: { lesson: 'minna-010', type: 'exercise-c', title: 'Exercise C' },
  40: { lesson: 'minna-010', type: 'conversation', title: 'Conversation: Do you have fish sauce?' },
  41: { lesson: 'minna-011', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  42: { lesson: 'minna-011', type: 'exercise-c', title: 'Exercise C' },
  43: { lesson: 'minna-011', type: 'conversation', title: 'Conversation: Please send this' },
  44: { lesson: 'minna-012', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  45: { lesson: 'minna-012', type: 'exercise-c', title: 'Exercise C' },
  46: { lesson: 'minna-012', type: 'conversation', title: 'Conversation: How was the Gion Festival?' },
  47: { lesson: 'minna-013', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  48: { lesson: 'minna-013', type: 'exercise-c', title: 'Exercise C' },
  49: { lesson: 'minna-013', type: 'conversation', title: 'Conversation: Separate checks, please' },
  50: { lesson: 'minna-014', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  51: { lesson: 'minna-014', type: 'exercise-c', title: 'Exercise C' },
  52: { lesson: 'minna-014', type: 'conversation', title: 'Conversation: Please take me to Umeda' },
  53: { lesson: 'minna-015', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  54: { lesson: 'minna-015', type: 'exercise-c', title: 'Exercise C' },
  55: { lesson: 'minna-015', type: 'conversation', title: 'Conversation: What about your family?' },
  56: { lesson: 'minna-016', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  57: { lesson: 'minna-016', type: 'exercise-c', title: 'Exercise C' },
  58: { lesson: 'minna-016', type: 'conversation', title: 'Conversation: Please tell me how to use it' },
  59: { lesson: 'minna-017', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  60: { lesson: 'minna-017', type: 'exercise-c', title: 'Exercise C' },
  61: { lesson: 'minna-017', type: 'conversation', title: 'Conversation: What\'s the matter?' },
  62: { lesson: 'minna-018', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  63: { lesson: 'minna-018', type: 'exercise-c', title: 'Exercise C' },
  64: { lesson: 'minna-018', type: 'conversation', title: 'Conversation: What is your hobby?' },
  65: { lesson: 'minna-019', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  66: { lesson: 'minna-019', type: 'exercise-c', title: 'Exercise C' },
  67: { lesson: 'minna-019', type: 'conversation', title: 'Conversation: I\'ll start my diet tomorrow' },
  68: { lesson: 'minna-020', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  69: { lesson: 'minna-020', type: 'exercise-c', title: 'Exercise C' },
  70: { lesson: 'minna-020', type: 'conversation', title: 'Conversation: Won\'t you come with us? (Casual)' },
  71: { lesson: 'minna-021', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  72: { lesson: 'minna-021', type: 'exercise-c', title: 'Exercise C' },
  73: { lesson: 'minna-021', type: 'conversation', title: 'Conversation: I think so, too' },
  74: { lesson: 'minna-022', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  75: { lesson: 'minna-022', type: 'exercise-c', title: 'Exercise C' },
  76: { lesson: 'minna-022', type: 'conversation', title: 'Conversation: What kind of room are you looking for?' },
  77: { lesson: 'minna-023', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  78: { lesson: 'minna-023', type: 'exercise-c', title: 'Exercise C' },
  79: { lesson: 'minna-023', type: 'conversation', title: 'Conversation: How do I get there?' },
  80: { lesson: 'minna-024', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  81: { lesson: 'minna-024', type: 'exercise-c', title: 'Exercise C' },
  82: { lesson: 'minna-024', type: 'conversation', title: 'Conversation: Could you help me out?' },
  83: { lesson: 'minna-025', type: 'sentence-patterns', title: 'Sentence Patterns & Example Sentences' },
  84: { lesson: 'minna-025', type: 'exercise-c', title: 'Exercise C' },
  85: { lesson: 'minna-025', type: 'conversation', title: 'Conversation: Thank you for everything' },
  86: { category: 'review', title: 'General Review 1' },
  87: { category: 'review', title: 'General Review 2' },
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadAudio() {
  console.log('🚀 Starting Honsatsu audio upload...\n');
  
  const files = readdirSync(SOURCE_DIR).filter(f => /^MP3_\d+\.mp3$/i.test(f));
  console.log(`Found ${files.length} MP3 files in ${SOURCE_DIR}\n`);
  
  const lessonTracks = {};
  const introTracks = [];
  const reviewTracks = [];
  
  for (const file of files) {
    const trackNum = parseInt(file.match(/MP3_(\d+)/i)[1]);
    const mapping = TRACK_MAP[trackNum];
    
    if (!mapping) {
      console.warn(`⚠️  No mapping for track ${trackNum} (${file})`);
      continue;
    }
    
    const filePath = join(SOURCE_DIR, file);
    const fileBuffer = readFileSync(filePath);
    
    let storagePath;
    if (mapping.category === 'intro') {
      storagePath = `honsatsu/intro/${file}`;
      introTracks.push({ track: trackNum, file, ...mapping });
    } else if (mapping.category === 'review') {
      storagePath = `honsatsu/review/${file}`;
      reviewTracks.push({ track: trackNum, file, ...mapping });
    } else {
      storagePath = `honsatsu/lessons/${mapping.lesson}/${file}`;
      if (!lessonTracks[mapping.lesson]) lessonTracks[mapping.lesson] = [];
      lessonTracks[mapping.lesson].push({ track: trackNum, file, ...mapping });
    }
    
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });
    
    if (error) {
      console.error(`❌ Failed to upload ${file}:`, error.message);
    } else {
      console.log(`✅ Uploaded ${file} → ${storagePath}`);
    }
  }
  
  console.log('\n📝 Generating lesson audio data files...\n');
  
  for (const [lessonSlug, tracks] of Object.entries(lessonTracks)) {
    const audioData = {
      lessonSlug,
      tracks: tracks.map(t => ({
        id: `${lessonSlug}-${t.type}`,
   0
     type: t.type,
        title: { en: t.title },
        audioUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/honsatsu/lessons/${lessonSlug}/${t.file}`
      }))
    };
    
    const lessonDir = join(ROOT, 'data/lessons', lessonSlug);
    if (!existsSync(lessonDir)) mkdirSync(lessonDir, { recursive: true });
    
    const dataPath = join(lessonDir, 'honsatsu-audio.json');
    writeFileSync(dataPath, JSON.stringify(audioData, null, 2));
    console.log(`✅ Generated ${dataPath}`);
    
    const manifestPath = join(lessonDir, 'manifest.json');
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      if (!manifest.dataFiles) manifest.dataFiles = {};
      manifest.dataFiles.honsatsuAudio = 'honsatsu-audio.json';
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`✅ Updated manifest for ${lessonSlug}`);
    }
  }
  
  if (introTracks.length > 0) {
    const introData = {
      category: 'intro',
      tracks: introTracks.map(t => ({
        id: `intro-${t.track}`,
        title: { en: t.title },
        audioUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/honsatsu/intro/${t.file}`
      }))
    };
    writeFileSync(join(ROOT, 'data/honsatsu-intro.json'), JSON.stringify(introData, null, 2));
    console.log('✅ Generated data/honsatsu-intro.json');
  }
  
  if (reviewTracks.length > 0) {
    const reviewData = {
      category: 'review',
      tracks: reviewTracks.map(t => ({
        id: `review-${t.track}`,
        title: { en: t.title },
        audioUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/honsatsu/review/${t.file}`
      }))
    };
    writeFileSync(join(ROOT, 'data/honsatsu-review.json'), JSON.stringify(reviewData, null, 2));
    console.log('✅ Generated data/honsatsu-review.json');
  }
  
  console.log('\n✨ Upload complete!');
}

uploadAudio().catch(err => {
  console.error('❌ Upload failed:', err);
  process.exit(1);
});
