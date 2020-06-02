import { test } from '@oclif/test';

describe('help command', () => {
  test
    .stdout()
    .command(['help'])
    .it('should prompt default help message', ctx => {
      expect(ctx.stdout).toContain('$ openrpc-cli [COMMAND]');
    });
});
