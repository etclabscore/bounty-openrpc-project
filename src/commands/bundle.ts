import * as path from 'path';

import { Command, flags } from '@oclif/command';
import * as Inquirer from 'inquirer';

import { readJsonFile, fileAlreadyExists, writeToFile } from '../file-utils';
import { styledString, log } from '../logger';
import { openrpcParse } from '../openrpc-parser';

export default class Bundle extends Command {
  static description = '';

  static examples = [
    `$ openrpc-cli bundle root-openrpc.json
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    output: flags.string({
      char: 'o',
      helpValue: '<file>',
      description: 'place the output into <file>',
    }),
    substitute: flags.boolean({
      char: 's',
      description: 'substitute $ref pointers with their resolved value',
    }),
  };

  static args = [{ name: 'file', required: true }];

  async run(): Promise<void> {
    const { args, flags } = this.parse(Bundle);

    const filePath = path.join(process.cwd(), args.file);

    // Set the output path
    const fileName = path.basename(filePath);
    const outputPath = flags.output
      ? path.join(process.cwd(), flags.output)
      : path.join(process.cwd(), fileName);
    const outputFileName = path.basename(outputPath);

    // TODO: Set the output format

    try {
      // If the output file already exists, confirm overwrite.
      if (fileAlreadyExists(outputPath)) {
        const { overwriteFile } = await Inquirer.prompt([
          {
            name: 'overwriteFile',
            prefix: styledString.warning(`${outputFileName} already exists.`),
            message: 'Replace? [y/n]',
            type: 'expand',
            choices: [
              { key: 'y', name: 'Overwrite', value: true },
              { key: 'n', name: 'Cancel', value: false },
            ],
            default: 1,
          },
        ]);

        if (!overwriteFile) {
          log.error('Canceled');
          process.exit(0);
        }
      }

      // Change the current working directory to the directory of the specified file
      process.chdir(path.dirname(filePath));

      // Read the specified file
      const jsonFile = readJsonFile(filePath);

      // Parse the specified file and write result to file
      const substituteRefs = flags.substitute ? true : false;
      const parsedOpenRpc = await openrpcParse(jsonFile, substituteRefs);
      const result = JSON.stringify(parsedOpenRpc, null, 2);
      writeToFile(outputPath, result);

      log.success(`Document written to ${outputFileName}`);
    } catch (error) {
      if (error?.isTtyError) {
        log.error('Prompt rendering failed.');
      } else {
        log.error(error?.message);
      }

      process.exit(1);
    }
  }
}
