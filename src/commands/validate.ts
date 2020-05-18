import * as fs from 'fs';
import * as path from 'path';

import { Command, flags } from '@oclif/command';

import { readYamlOrJsonFileAsJson } from '../file-utils';
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

    try {
      // Read the specified file
      const jsonContent = readYamlOrJsonFileAsJson(filePath);

      const result = openrpcValidate(jsonContent);
      if (result.hasErrors) {
        console.log(result.errors);
        this.exit(1);
      }

      log.success('Valid!');
    } catch (error) {
      log.error(error?.message);
    }
  }
}
