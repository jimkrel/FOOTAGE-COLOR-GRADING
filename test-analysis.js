import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeVideo } from './analysis-engine/ffmpegSampler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testVideoPath = path.join(__dirname, 'test_sample.mp4');

console.log('=== FOOTAGE COLOR ANALYZER: CLI TEST ===');
console.log('1. Generating synthetic test video (6 seconds):');
console.log('   - 0s-2s: Normal neutral gray');
console.log('   - 2s-4s: Overexposed bright white');
console.log('   - 4s-6s: Blue cool cast');

// Generate test video using FFmpeg lavfi filters
const genResult = spawnSync(ffmpegPath, [
  '-y',
  '-f', 'lavfi', '-i', 'color=c=gray:s=320x240:d=2',
  '-f', 'lavfi', '-i', 'color=c=white:s=320x240:d=2',
  '-f', 'lavfi', '-i', 'color=c=blue:s=320x240:d=2',
  '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0[outv]',
  '-map', '[outv]',
  '-pix_fmt', 'yuv420p',
  testVideoPath
]);

if (genResult.status !== 0) {
  console.error('Failed to generate test video:', genResult.stderr.toString());
  process.exit(1);
}
console.log('Test video created at:', testVideoPath);

console.log('\n2. Running analyzeVideo()...');
const startTime = Date.now();

try {
  const result = await analyzeVideo(testVideoPath, {
    fps: 1,
    onProgress: (p) => {
      const total = p.totalSec || p.totalDuration || 0;
      console.log(`[Progress] ${p.percent}% (time: ${p.currentSec.toFixed(1)}s / ${total.toFixed(1)}s)`);
    }
  });

  const elapsedMs = Date.now() - startTime;
  console.log(`\nAnalysis completed in ${elapsedMs}ms!`);
  console.log('Video Duration:', result.duration, 'seconds');
  console.log('Sampled Frames count:', result.sampleCount);

  console.log('\n--- Detected Segments ---');
  console.table(result.segments.map(s => ({
    'Start': `${s.start}s`,
    'End': `${s.end}s`,
    'Duration': `${s.duration}s`,
    'Issue': s.issueType,
    'Y (Luma)': s.avgY,
    'R': s.avgR,
    'G': s.avgG,
    'B': s.avgB,
    'Severity': s.severity
  })));

  console.log('\n--- Overall Clip Stats ---');
  console.log(result.stats);

  console.log('\nTEST PASSED SUCCESSFUL!');
} catch (err) {
  console.error('Analysis failed:', err);
  process.exit(1);
}
