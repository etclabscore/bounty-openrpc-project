import * as fs from 'fs';
import * as path from 'path';

import { Command, flags } from '@oclif/command';

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

    const filePath = path.join(process.cwd(), args.file);

    let fileContent: string;
    try {
      const file = fs.readFileSync(filePath);
      fileContent = file.toString();
    } catch (error) {
      console.log(error);
      this.error('File could not be read.');
    }

    let parsedFileContent: any;
    try {
      parsedFileContent = JSON.parse(fileContent);
    } catch (error) {
      this.error(`File doesn't contain valid JSON`);
    }

    const result = openrpcValidate(parsedFileContent);
    if (result.hasErrors) {
      console.log(result.errors);
    } else {
      this.log(`Valid!`);
      this.log(`   [${path.basename(filePath)}]`);
    }
  }
}
