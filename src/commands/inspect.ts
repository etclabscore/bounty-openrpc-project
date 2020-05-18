import * as path from 'path';

import { Command, flags } from '@oclif/command';
import {
  Client,
  HTTPTransport,
  WebSocketTransport,
  RequestManager,
} from '@open-rpc/client-js';
import * as Ajv from 'ajv';
import * as Inquirer from 'inquirer';

import { readYamlOrJsonFileAsJson } from '../file-utils';
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

  private async promptForServerUrl(): Promise<string> {
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

    return serverUrl;
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

  private async addressFromServerObjects(
    servers?: {
      name: string;
      url: string;
      summary?: string;
      description?: string;
      variables?: Map<
        string,
        { default: string; enum?: string[]; description?: string }
      >;
    }[]
  ): Promise<{ url: string; transport: string }> {
    // If the array of Server objects doesn't exist in the OpenRPC document or
    // if it is empty, prompt the user for the server's URL.
    if (!servers || servers.length === 0) {
      // Prompt for the server's URL
      const url = await this.promptForServerUrl();

      return { url, transport: this.protocolFromUrl(url) };
    }

    if (servers.length === 1) {
      const { url } = servers[0];

      return { url, transport: this.protocolFromUrl(url) };
    }

    // Else, if there are multiple server objects
    log.info('Multiple server objects detected in OpenRPC document.');

    // Prompt for the server's URL
    const url = await this.promptForServerUrl();

    return { url, transport: this.protocolFromUrl(url) };
  }

  private protocolFromUrl(url: string): string {
    const parts = url.split(':/');
    return parts[0];
  }

  async run(): Promise<void> {
    const { args } = this.parse(Inspect);

    const filePath = path.resolve(args.file);

    let client: Client;
    let methodName: string;
    const paramValues: any[] = [];
    try {
      // Change the current working directory to the directory of the specified
      // file. This is necessary for resolving $ref pointers that reference
      // schemas inside other files.
      process.chdir(path.dirname(filePath));

      // Read the specified file
      const jsonContent = readYamlOrJsonFileAsJson(filePath);

      // Parse the specified file
      const parsedOpenRpc: any = await openrpcParse(jsonContent, true);

      //== Connect to server
      const { url, transport } = await this.addressFromServerObjects(
        parsedOpenRpc.servers
      );

      log.info(`Connecting to ${url}`);

      let requestManager;
      if (transport === 'ws') {
        requestManager = new RequestManager([new WebSocketTransport(url)]);
      } else {
        requestManager = new RequestManager([new HTTPTransport(url)]);
      }

      client = new Client(requestManager);
      //==

      const methods = parsedOpenRpc.methods;
      if (methods.length === 0) {
        log.warn('No methods inside OpenRPC document.');
        process.exit(0);
      }

      // Prompt for the method to call
      const { chosenMethodName } = await Inquirer.prompt([
        {
          name: 'chosenMethodName',
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
      methodName = chosenMethodName;

      const methodParams = methods.find(
        (m: { name: string }) => m.name === methodName
      ).params;

      // Prompt for the param values of the method to be called
      for (let i = 0; i < methodParams.length; i++) {
        const result = await this.promptForParamValue(methodParams[i]);
        paramValues.push(result);
      }

      // Make a request
      const result = await client.request(methodName, paramValues);

      // Print result
      log.success(JSON.stringify(result, null, 2));
    } catch (error) {
      if (error?.isTtyError) {
        log.error('Prompt rendering failed.');
      } else {
        log.error(error?.message);
      }
    }
  }
}
