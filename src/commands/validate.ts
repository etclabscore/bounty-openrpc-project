import * as fs from 'fs';
import * as path from 'path';

import { Command, flags } from '@oclif/command';

import { log } from '../logger';
import { openrpcValidate } from '../openrpc-validator';

export default class Validate extends Command {
  static description = 'validate an OpenRPC document';

  static examples = [
    `$ openrpc-cli validate openrpc.json
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  static args = [{ name: 'file', required: true }];

  async run(): Promise<void> {
    const { args } = this.parse(Validate);

    const filePath = path.resolve(args.file);

    let fileContent: string;
    try {
      const file = fs.readFileSync(filePath);
      fileContent = file.toString();
    } catch (error) {
      if (error?.code === 'ENOENT') {
        log.error('File not found.');
        this.exit(1);
      }

      log.error('File could not be read.');
      this.exit(1);
    }

    let parsedFileContent: any;
    try {
      parsedFileContent = JSON.parse(fileContent);
    } catch (error) {
      log.error(`File doesn't contain valid JSON.`);
      this.exit(1);
    }

    const result = openrpcValidate(parsedFileContent);
    if (result.hasErrors) {
      console.log(result.errors);
      this.exit(1);
    }

    log.success('Valid!');
  }
}
