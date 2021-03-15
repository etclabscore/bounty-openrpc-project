import * as path from 'path';

import { Command, flags } from '@oclif/command';
import {
  Client,
  HTTPTransport,
  WebSocketTransport,
  RequestManager,
} from '@open-rpc/client-js';
import { Transport } from '@open-rpc/client-js/build/transports/Transport';
import * as Ajv from 'ajv';
import * as CliHighlight from 'cli-highlight';
import * as Inquirer from 'inquirer';

import { readYamlOrJsonFileAsJson } from '../file-utils';
import { log, styledString } from '../logger';
import { openrpcParse } from '../openrpc-parser';

export default class Inspect extends Command {
  static description = 'call methods inside an OpenRPC document';

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

  private protocolFromUrl(url: string): string {
    const parts = url.split(':/');
    return parts[0];
  }

  private variablesMap(variables?: {
    [key: string]: { default: string; enum?: string[]; description?: string };
  }): Map<string, { default: string; enum?: string[]; description?: string }> {
    let variablesMap;

    if (variables) {
      variablesMap = new Map(Object.entries(variables));
    } else {
      variablesMap = new Map();
    }

    return variablesMap;
  }

  private resolveUrlFromVariables(
    url: string,
    variables: Map<
      string,
      { default: string; enum?: string[]; description?: string }
    >
  ): string {
    const variablesFromUrl: string[] = [];

    const r = /.*?\$\{(.*?)\}/g;
    let match;
    while ((match = r.exec(url)) !== null) {
      variablesFromUrl.push(match[1]);
    }

    let resolvedUrl = url;
    variablesFromUrl.forEach((v: string) => {
      const variableValue = variables.get(v)?.default ?? '';

      resolvedUrl = resolvedUrl.replace(`\$\{${v}\}`, variableValue);
    });

    return resolvedUrl;
  }

  private async addressFromServerObjects(
    servers: {
      name: string;
      url: string;
      summary?: string;
      description?: string;
      variables?: {
        [name: string]: {
          default: string;
          enum?: string[];
          description?: string;
        };
      };
    }[]
  ): Promise<string> {
    if (servers.length === 1) {
      const { url, variables } = servers[0];

      return this.resolveUrlFromVariables(url, this.variablesMap(variables));
    }

    // Else, if there are multiple server objects
    log.info('Multiple server objects detected in OpenRPC document.');

    // Prompt for the server to use since there are multiple server objects
    const { chosenServerResolvedUrl } = await Inquirer.prompt([
      {
        name: 'chosenServerResolvedUrl',
        prefix: styledString.info('?'),
        message: 'Choose method',
        type: 'list',
        choices: servers.map(
          (s: {
            name: string;
            url: string;
            variables?: {
              [key: string]: {
                default: string;
                enum?: string[];
                description?: string;
              };
            };
          }) => {
            const resolvedUrl = this.resolveUrlFromVariables(
              s.url,
              this.variablesMap(s.variables)
            );

            return { name: `${s.name} @ ${resolvedUrl}`, value: resolvedUrl };
          }
        ),
        default: 0,
      },
    ]);

    return chosenServerResolvedUrl;
  }

  private transportFromUrl(url: string): Transport {
    if (this.protocolFromUrl(url) === 'ws') {
      return new WebSocketTransport(url);
    }

    return new HTTPTransport(url);
  }

  private async obtainMethodNameAndParamValues(
    parsedOpenRpc: any
  ): Promise<{ methodName: string; paramValues: any[] }> {
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

    const paramValues: any[] = [];
    // Prompt for the param values of the method to be called
    for (let i = 0; i < methodParams.length; i++) {
      const result = await this.promptForParamValue(methodParams[i]);
      paramValues.push(result);
    }

    return { methodName, paramValues };
  }

  private async callMethod(client: Client, parsedOpenRpc: any): Promise<void> {
    // Obtain method to connect to and the values of the chosen method's params
    const {
      methodName,
      paramValues,
    } = await this.obtainMethodNameAndParamValues(parsedOpenRpc);

    const result = await client.request({
      method: methodName,
      params: paramValues,
    });
    const resultString = JSON.stringify(result, null, 2);

    // Highlight and print result
    console.log(CliHighlight.highlight(resultString, { language: 'json' }));
  }

  async run(): Promise<void> {
    const { args } = this.parse(Inspect);

    const filePath = path.resolve(args.file);

    try {
      // Change the current working directory to the directory of the specified
      // file. This is necessary for resolving $ref pointers that reference
      // schemas inside other files.
      process.chdir(path.dirname(filePath));

      // Read the specified file
      const jsonContent = readYamlOrJsonFileAsJson(filePath);

      // Parse the specified file
      const parsedOpenRpc: any = await openrpcParse(jsonContent, true);

      //== Obtain server URL
      let url = '';
      let connectToResolved = false;

      // If the array of Server objects exists in the OpenRPC document and
      // isn't empty,
      if (parsedOpenRpc.servers || parsedOpenRpc.servers.length > 0) {
        url = await this.addressFromServerObjects(parsedOpenRpc.servers);

        // Ask confirmation, to connect to the resolved URL
        const { confirmed } = await Inquirer.prompt([
          {
            name: 'confirmed',
            prefix: styledString.info('?'),
            message: `Connect to ${url}`,
            type: 'confirm',
            default: true,
          },
        ]);
        connectToResolved = confirmed;
      }

      if (!connectToResolved) {
        // Prompt for the server's URL
        url = await this.promptForServerUrl();
      }
      //==

      //== Connect to server
      log.info(`Connecting to ${url}...`);

      const transport = this.transportFromUrl(url);

      const requestManager = new RequestManager([transport]);
      const client = new Client(requestManager);
      //==

      for (;;) {
        // Make a request
        await this.callMethod(client, parsedOpenRpc);

        const { nextAction } = await Inquirer.prompt([
          {
            name: 'nextAction',
            prefix: styledString.info('?'),
            message: 'Again?',
            type: 'expand',
            choices: [
              { key: 'c', name: 'Call another method', value: 'c' },
              { key: 'q', name: 'End', value: 'q' },
            ],
          },
        ]);

        switch (nextAction) {
          case 'c':
            continue;
          case 'q':
            process.exit(0);
        }
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
