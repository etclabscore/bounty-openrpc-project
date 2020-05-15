import * as fs from 'fs';

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

export { readJsonFile, fileAlreadyExists, writeToFile };
