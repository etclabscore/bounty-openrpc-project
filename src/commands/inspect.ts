import * as fs from 'fs';
import * as path from 'path';

import { Command, flags } from '@oclif/command';
import { Client, HTTPTransport, RequestManager } from '@open-rpc/client-js';
import * as Ajv from 'ajv';
import * as Inquirer from 'inquirer';

import { readJsonFile } from '../file-utils';
import { log, styledString } from '../logger';
import { openrpcParse } from '../openrpc-parser';

export default class Inspect extends Command {
  static description = '';

  static examples = [
    `$ openrpc-cli inspect openrpc.json
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  static args = [{ name: 'file', required: true }];

  private ajv = new Ajv();

  private validateUserInput(schema: object): (input: string) => boolean {
    return (input: string): boolean => {
      try {
        if (input.length === 0) {
          return false;
        }

        const parsedInput = JSON.parse(input);

        return this.ajv.validate(schema, parsedInput) ? true : false;
      } catch (error) {
        return false;
      }
    };
  }

  private async promptForParamValue(param: {
    name: string;
    schema: object;
  }): Promise<string> {
    const { paramValue } = await Inquirer.prompt([
      {
        type: 'input',
        name: 'paramValue',
        prefix: styledString.info('?'),
        message: `Enter value for [${param.name}], schema: ${JSON.stringify(
          param.schema
        )}`,
        validate: this.validateUserInput(param.schema),
      },
    ]);

    return JSON.parse(paramValue);
  }

  async run(): Promise<void> {
    const { args } = this.parse(Inspect);

    const filePath = path.join(process.cwd(), args.file);

    try {
      // Change the current working directory to the directory of the specified file.
      process.chdir(path.dirname(filePath));

      // Read the specified file
      const jsonFile = readJsonFile(filePath);

      // Parse the specified file
      const parsedOpenRpc: any = await openrpcParse(jsonFile, true);

      // Prompt for the server's URL
      const { serverUrl } = await Inquirer.prompt([
        {
          type: 'input',
          name: 'serverUrl',
          prefix: styledString.info('?'),
          message: 'Enter URL of the server',
          default: 'http://localhost:3000',
          validate: (input: string): boolean => {
            return input.length !== 0;
          },
        },
      ]);

      const methods = parsedOpenRpc.methods;
      if (methods.length === 0) {
        log.warn('No methods inside OpenRPC document.');
        process.exit(0);
      }

      // Prompt for the method to call
      const { methodName } = await Inquirer.prompt([
        {
          name: 'methodName',
          prefix: styledString.info('?'),
          message: 'Choose method',
          type: 'list',
          choices: methods.map((m: { name: string }) => ({
            name: m.name,
            value: m.name,
          })),
          default: 0,
        },
      ]);

      const methodParams = methods.find(
        (m: { name: string }) => m.name === methodName
      ).params;

      // Prompt for the param values of the method to be called
      const paramValues: any[] = [];
      for (let i = 0; i < methodParams.length; i++) {
        const result = await this.promptForParamValue(methodParams[i]);
        paramValues.push(result);
      }

      // let transport: HTTPTransport;
      // let serverTransport = 'http';
      const client = new Client(
        new RequestManager([new HTTPTransport(serverUrl)])
      );

      const result = await client.request(methodName, paramValues);

      // Print result
      log.success(JSON.stringify(result, null, 2));
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
