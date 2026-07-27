import { buildWallpaperUploadMetrics, program } from '../cli';

describe('upload-wallpaper CLI command', () => {
  test('exposes a command backed by the SDK wallpaper API', () => {
    const command = program.commands.find(item => item.name() === 'upload-wallpaper');

    expect(command).toBeDefined();
    expect(command?.description()).toBe('Upload and activate a Pro2 wallpaper');
  });

  test('reports effective transfer speed from encoded bytes and elapsed time', () => {
    expect(
      buildWallpaperUploadMetrics({
        totalBytes: 2_473_984,
        transferredBytes: 2_473_984,
        startedAt: 1_000,
        endedAt: 2_000,
        lastProgress: 100,
      })
    ).toEqual({
      totalBytes: 2_473_984,
      transferredBytes: 2_473_984,
      totalSeconds: 1,
      transferKiBPerSecond: 2416,
      lastProgress: 100,
    });
  });

  test('uses confirmed bytes for an interrupted transfer rate', () => {
    expect(
      buildWallpaperUploadMetrics({
        totalBytes: 1_855_500,
        transferredBytes: 631_800,
        startedAt: 1_000,
        endedAt: 101_000,
        lastProgress: 34,
      })
    ).toEqual({
      totalBytes: 1_855_500,
      transferredBytes: 631_800,
      totalSeconds: 100,
      transferKiBPerSecond: 6.17,
      lastProgress: 34,
    });
  });
});
