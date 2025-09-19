const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

jest.setTimeout(60000);

describe('extension build packaging', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');
  const buildScript = path.join(projectRoot, 'scripts', 'build-extension.sh');
  const manifestPath = path.join(projectRoot, 'manifest.json');
  let zipPath;

  beforeAll(() => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    zipPath = path.join(distDir, `youtube-hide-watched-video-extension-v${manifest.version}.zip`);
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
    execFileSync('bash', [buildScript], { cwd: projectRoot, stdio: 'ignore' });
  });

  afterAll(() => {
    if (zipPath && fs.existsSync(zipPath)) {
      fs.rmSync(zipPath);
    }
    if (fs.existsSync(distDir) && fs.readdirSync(distDir).length === 0) {
      fs.rmdirSync(distDir);
    }
  });

  test('packages background modules', () => {
    expect(fs.existsSync(zipPath)).toBe(true);
    const output = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf8' });
    expect(output).toEqual(expect.stringContaining('background/hiddenVideosService.js'));
    expect(output).toEqual(expect.stringContaining('background/indexedDb.js'));
  });
});
