import * as path from 'path';

import { Command, flags } from '@oclif/command';
import * as Inquirer from 'inquirer';
import * as JsYaml from 'js-yaml';

import {
  readJsonFile,
  fileAlreadyExists,
  writeToFile,
  readYamlFileAsJson,
} from '../file-utils';
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

    const filePath = path.join(process.cwd(), args.file);

    // Set the output path
    const outputPath = flags.output
      ? path.join(process.cwd(), flags.output)
      : '';
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
          process.exit(0);
        }
      }

      // Change the current working directory to the directory of the specified file
      process.chdir(path.dirname(filePath));

      //== Read the specified file
      let jsonContent;
      const inputFileExtension = path.extname(filePath);
      switch (inputFileExtension) {
        // If the input file's extension is either '.yaml' or '.yml', load the
        // input file as YAML and convert it to JSON.
        case '.yaml':
        case '.yml':
          jsonContent = readYamlFileAsJson(filePath);
          break;
        default:
          jsonContent = readJsonFile(filePath);
      }
      //==

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
