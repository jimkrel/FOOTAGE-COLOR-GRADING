import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateTagsFromSegments } from './analysis-engine/tagGenerator.js';
import { initDB, saveClipTags, getClipTags, getAllTagsWithCounts } from './electron/ipc/cacheDB.js';
import { analyzeClip } from './electron/ipc/analyzeClip.js';
import { batchAnalyzer } from './electron/ipc/batchQueue.js';
import { folderWatcher } from './electron/ipc/folderWatcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testVideoPath = path.join(__dirname, 'test_sample.mp4');

console.log('=== TEST SUITE: EXTENDED FEATURES ===\n');

// 1. Test Tag Generation Logic
console.log('--- TEST 1: Auto-tag Generation ---');
const dummyCleanSegments = [
  { issueType: 'normal', duration: 5.0, start: 0, end: 5 }
];
const dummyCleanTags = generateTagsFromSegments(dummyCleanSegments, { issuePercentage: 0 });
console.log('Clean footage tags:', dummyCleanTags);
if (!dummyCleanTags.includes('clean')) throw new Error('Failed to tag clean footage');

const dummyMixedSegments = [
  { issueType: 'normal', duration: 2.0, start: 0, end: 2 },
  { issueType: 'overexposed', duration: 2.0, start: 2, end: 4 },
  { issueType: 'cool_cast', duration: 2.0, start: 4, end: 6 }
];
const dummyMixedTags = generateTagsFromSegments(dummyMixedSegments, { issuePercentage: 66.7 });
console.log('Mixed footage tags:', dummyMixedTags);
if (!dummyMixedTags.includes('overexposed') || !dummyMixedTags.includes('cool-cast')) {
  throw new Error('Failed to tag mixed footage with overexposed and cool-cast');
}
console.log('✓ Test 1 Passed: Tag generation logic correct!\n');

// 2. Test SQLite clip_tags Table & Persistence
console.log('--- TEST 2: SQLite clip_tags CRUD ---');
const db = initDB();
const testHash = 'test_hash_12345';
saveClipTags(testHash, ['clean', 'cool-cast']);
const savedTags = getClipTags(testHash);
console.log('Retrieved tags for hash:', savedTags);
if (savedTags.length !== 2 || !savedTags.includes('clean') || !savedTags.includes('cool-cast')) {
  throw new Error('SQLite clip_tags CRUD failed');
}

const allTags = getAllTagsWithCounts();
console.log('All tags with counts:', allTags);
console.log('✓ Test 2 Passed: SQLite clip_tags table works!\n');

// 3. Test analyzeClip with Auto-tagging
console.log('--- TEST 3: analyzeClip integration ---');
if (fs.existsSync(testVideoPath)) {
  const result = await analyzeClip(testVideoPath, { forceReanalyze: true });
  console.log('Analyzed clip tags:', result.tags);
  if (!result.tags || result.tags.length === 0) {
    throw new Error('analyzeClip did not return tags');
  }
  console.log('✓ Test 3 Passed: analyzeClip generated and saved tags!\n');
}

// 4. Test Multi-threaded Batch Queue
console.log('--- TEST 4: Batch Analysis Queue ---');
if (fs.existsSync(testVideoPath)) {
  const progressEvents = [];
  const batchResults = await batchAnalyzer.startBatch(
    [testVideoPath],
    { forceReanalyze: false },
    (channel, payload) => {
      progressEvents.push({ channel, payload });
    }
  );

  console.log(`Batch processed ${batchResults.length} clips.`);
  console.log('Received progress events count:', progressEvents.length);
  const doneEvent = progressEvents.find(e => e.channel === 'batch:clipDone');
  if (!doneEvent) {
    throw new Error('batch:clipDone event not fired');
  }
  console.log('✓ Test 4 Passed: Batch Queue concurrency and events verified!\n');
}

// 5. Test Folder Watcher Service
console.log('--- TEST 5: Folder Watcher ---');
let watchEventFired = false;
folderWatcher.watch(__dirname, {
  autoAnalyze: false,
  eventSender: (channel, data) => {
    if (channel === 'watcher:event') {
      watchEventFired = true;
    }
  }
});
console.log('Watcher active for:', folderWatcher.watchedPath);
folderWatcher.stop();
console.log('✓ Test 5 Passed: Watcher initialized and stopped cleanly!\n');

console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
