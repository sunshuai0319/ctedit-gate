import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const webRoot = join(process.cwd(), 'apps', 'web');

describe('browser secret boundary', () => {
  it('does not include a server secret sentinel in the production bundle', async () => {
    const distRoot = join(webRoot, 'dist');
    const files = await readdir(distRoot, { recursive: true });
    const contents = await Promise.all(
      files
        .filter((file): file is string => typeof file === 'string')
        .map((file) => readFile(join(distRoot, file), 'utf8').catch(() => '')),
    );

    expect(files.length).toBeGreaterThan(0);
    expect(contents.join('\n')).not.toContain('TEST_APP_SECRET_SENTINEL');
  });

  it('does not put a real server secret in the example environment file', async () => {
    const contents = await readFile(join(process.cwd(), '.env.example'), 'utf8');
    expect(contents).not.toContain('TEST_APP_SECRET_SENTINEL');
  });
});
