import * as path from 'path';

import { Command, flags } from '@oclif/command';
import * as Inquirer from 'inquirer';
import * as JsYaml from 'js-yaml';

import {
  readYamlOrJsonFileAsJson,
  fileAlreadyExists,
  writeToFile,
} from '../file-utils';
import { styledString, log } from '../logger';
import { openrpcParse } from '../openrpc-parser';

export default class Bundle extends Command {
  static description = 'make a single OpenRPC document by resolving $ref';

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
    format: flags.string({
      default: 'json',
      options: ['json', 'yaml'],
      char: 'f',
      description: 'the output format',
    }),
    substitute: flags.boolean({
      char: 's',
      description: 'substitute $ref pointers with their resolved value',
    }),
  };

  static args = [{ name: 'file', required: true }];

  async run(): Promise<void> {
    const { args, flags } = this.parse(Bundle);

    const filePath = path.resolve(args.file);

    // Set the output path
    const outputPath = flags.output ? path.resolve(flags.output) : '';
    const outputFileName = path.basename(outputPath);

    // Output to 'stdout' if the output flag is not provided
    const outputToStdout = outputPath === '';

    try {
      // If the output file already exists, confirm overwrite.
      if (!outputToStdout && fileAlreadyExists(outputPath)) {
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
          return;
        }
      }

      // Change the current working directory to the directory of the specified
      // file. This is necessary for resolving $ref pointers that reference
      // schemas inside other files.
      process.chdir(path.dirname(filePath));

      // Read the specified input file
      const jsonContent = readYamlOrJsonFileAsJson(filePath);

      // Parse the specified file
      const substituteRefs = flags.substitute ? true : false;
      const parsedOpenRpc = await openrpcParse(jsonContent, substituteRefs);

      //== Determine the output format
      let outputFormat = flags.format;

      // If the output flag is provided and if the output file's extension is
      // either '.yaml' or '.yml', change the output format to YAML.
      if (flags.output) {
        const outputFileExtension = path.extname(outputPath);

        if (['.yaml', '.yml'].includes(outputFileExtension)) {
          outputFormat = 'yaml';
        }
      }
      //==

      // Produce final result based on output format
      let result;
      if (outputFormat === 'json') {
        result = JSON.stringify(parsedOpenRpc, null, 2);
      } else {
        result = JsYaml.dump(parsedOpenRpc, { noRefs: true });
      }

      // Write result to stdout or to the output file
      if (outputToStdout) {
        console.log(result);
      } else {
        writeToFile(outputPath, result);
      }

      if (!outputToStdout) {
        log.success(`Document written to ${outputFileName}`);
      }
    } catch (error) {
      if (error?.isTtyError) {
        log.error('Prompt rendering failed.');
      } else {
        log.error(error?.message);
      }
    }
  }
}
