import fs from 'fs';
import path from 'path';
import { isVideoFile, scanFolder, importPaths, SUPPORTED_VIDEO_EXTENSIONS } from './electron/ipc/scanFolder.js';

console.log('=== TEST SUITE: VIDEO FORMAT RECOGNITION & RECURSIVE DISCOVERY ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passCount++;
  } else {
    console.error(`✗ FAILED: ${message}`);
    failCount++;
  }
}

// --- TEST 1: Extension Matching (Case-insensitivity & Diversity) ---
console.log('--- TEST 1: Supported Formats & Case-Insensitivity ---');

const VALID_VIDEO_TESTS = [
  'clip.mp4', 'clip.MP4', 'clip.Mp4',
  'sony.mov', 'CANON.MOV',
  'fx3_broadcast.mxf', 'RED_CAM.MXF',
  'avchd_stream.mts', 'PANASONIC.M2TS', 'transport.ts', 'STREAM.TS',
  'blackmagic.braw', 'BMPCC6K.BRAW',
  'red_digital.r3d', 'HELIUM.R3D',
  'canon_raw.crm', 'master.prores',
  'web_clip.webm', 'matroska.mkv', 'windows.avi', 'media.wmv',
  'disc.vob', 'mobile.3gp', 'flash.flv', 'video.ogv'
];

VALID_VIDEO_TESTS.forEach(filename => {
  assert(isVideoFile(filename), `Recognized valid video format: ${filename}`);
});

const INVALID_FILES = [
  'notes.txt', 'image.jpg', 'preview.png', 'project.prproj',
  'subtitles.srt', 'audio.mp3', 'wave.wav', 'archive.zip',
  'metadata.xml', 'script.js', 'package.json', ''
];

INVALID_FILES.forEach(filename => {
  assert(!isVideoFile(filename), `Correctly rejected non-video file: ${filename || '(empty)'}`);
});

// --- TEST 2: Recursive Camera SD Card Simulation ---
console.log('\n--- TEST 2: Camera Card Structure & Recursive Scan ---');

const TEST_DIR = path.join(process.cwd(), 'temp_test_camera_card');

// Cleanup if exists
if (fs.existsSync(TEST_DIR)) {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
}

// Create complex nested camera card directories
fs.mkdirSync(path.join(TEST_DIR, 'DCIM', '100MSDCF'), { recursive: true });
fs.mkdirSync(path.join(TEST_DIR, 'PRIVATE', 'M4ROOT', 'CLIP'), { recursive: true });
fs.mkdirSync(path.join(TEST_DIR, 'BLACKMAGIC', 'REEL_01'), { recursive: true });
fs.mkdirSync(path.join(TEST_DIR, 'RED_MAG', 'A001_R3D'), { recursive: true });
fs.mkdirSync(path.join(TEST_DIR, 'node_modules', 'subpkg'), { recursive: true });
fs.mkdirSync(path.join(TEST_DIR, '.git'), { recursive: true });

// Create dummy video files
fs.writeFileSync(path.join(TEST_DIR, 'DCIM', '100MSDCF', 'C0001.MP4'), 'dummy video data');
fs.writeFileSync(path.join(TEST_DIR, 'PRIVATE', 'M4ROOT', 'CLIP', 'C0002.MXF'), 'dummy video data');
fs.writeFileSync(path.join(TEST_DIR, 'BLACKMAGIC', 'REEL_01', 'A001_C001.braw'), 'dummy video data');
fs.writeFileSync(path.join(TEST_DIR, 'RED_MAG', 'A001_R3D', 'A001_C002.R3D'), 'dummy video data');
fs.writeFileSync(path.join(TEST_DIR, 'root_video.mov'), 'dummy video data');

// Create files that should be ignored
fs.writeFileSync(path.join(TEST_DIR, 'node_modules', 'fake.mp4'), 'should be ignored');
fs.writeFileSync(path.join(TEST_DIR, '.git', 'git_fake.mov'), 'should be ignored');
fs.writeFileSync(path.join(TEST_DIR, 'DCIM', '100MSDCF', 'thumbnail.thm'), 'thumbnail data');
fs.writeFileSync(path.join(TEST_DIR, 'PRIVATE', 'M4ROOT', 'CLIP', 'clip.xml'), 'xml metadata');

async function runRecursiveTest() {
  const discoveredClips = await scanFolder(TEST_DIR, { recursive: true });

  console.log(`Discovered ${discoveredClips.length} video files in nested camera card folders:`);
  discoveredClips.forEach(c => console.log(`  - ${c.fileName} (${c.filePath})`));

  assert(discoveredClips.length === 5, `Found exactly 5 valid video files across all nested folders (expected 5, got ${discoveredClips.length})`);

  const fileNames = discoveredClips.map(c => c.fileName);
  assert(fileNames.includes('C0001.MP4'), 'Discovered Sony DCIM MP4');
  assert(fileNames.includes('C0002.MXF'), 'Discovered Sony M4ROOT MXF');
  assert(fileNames.includes('A001_C001.braw'), 'Discovered Blackmagic BRAW');
  assert(fileNames.includes('A001_C002.R3D'), 'Discovered RED R3D');
  assert(fileNames.includes('root_video.mov'), 'Discovered Root MOV');
  assert(!fileNames.includes('fake.mp4'), 'Ignored node_modules directory');
  assert(!fileNames.includes('git_fake.mov'), 'Ignored .git directory');
  assert(!fileNames.includes('thumbnail.thm'), 'Ignored .thm thumbnail file');
  assert(!fileNames.includes('clip.xml'), 'Ignored .xml metadata file');

  // --- TEST 3: Drag & Drop importPaths() test ---
  console.log('\n--- TEST 3: Drag & Drop importPaths Handler ---');
  const individualFile = path.join(TEST_DIR, 'DCIM', '100MSDCF', 'C0001.MP4');
  const redFolder = path.join(TEST_DIR, 'RED_MAG');

  const droppedResults = await importPaths([individualFile, redFolder]);
  console.log(`Imported ${droppedResults.length} clips from mixed drop array:`);
  droppedResults.forEach(c => console.log(`  - ${c.fileName}`));

  assert(droppedResults.length === 2, `importPaths handled mixed dropped file + folder correctly (expected 2, got ${droppedResults.length})`);

  // --- Cleanup ---
  fs.rmSync(TEST_DIR, { recursive: true, force: true });

  console.log(`\n=== TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED ===`);
  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL VIDEO RECOGNITION TESTS PASSED CLEANLY!\n');
  }
}

runRecursiveTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
