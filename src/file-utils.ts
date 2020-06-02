import * as fs from 'fs';
import * as path from 'path';

import * as JsYaml from 'js-yaml';

const readJsonFile = (filePath: string): any => {
  let fileContent = '';

  try {
    const file = fs.readFileSync(filePath);
    fileContent = file.toString();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('File not found.');
    }

    throw new Error('File could not be read.');
  }

  let parsedFileContent: any;
  try {
    parsedFileContent = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`File doesn't contain valid JSON.`);
  }

  return parsedFileContent;
};

const readYamlFileAsJson = (filePath: string): any => {
  let fileContent = '';

  try {
    const file = fs.readFileSync(filePath);
    fileContent = file.toString();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('File not found.');
    }

    throw new Error('File could not be read.');
  }

  let parsedFileContent: any;
  try {
    parsedFileContent = JsYaml.safeLoad(fileContent);
  } catch (error) {
    throw new Error(`File doesn't contain valid YAML.`);
  }

  return parsedFileContent;
};

const readYamlOrJsonFileAsJson = (filePath: string): any => {
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

  return jsonContent;
};

const fileAlreadyExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

const writeToFile = (filePath: string, data: any): void => {
  try {
    fs.writeFileSync(filePath, data);
  } catch (error) {
    throw new Error('Something went wrong while writing to file.');
  }
};

export {
  readJsonFile,
  readYamlFileAsJson,
  readYamlOrJsonFileAsJson,
  fileAlreadyExists,
  writeToFile,
};
