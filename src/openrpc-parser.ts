import * as JsonSchemaRefParser from 'json-schema-ref-parser';

import { openrpcValidate } from './openrpc-validator';

const refParser = new JsonSchemaRefParser();

const openrpcParse = async (
  data: any,
  substituteRefs = true
): Promise<object> => {
  // Validate
  // const { valid, hasErrors } = openrpcValidate(data);
  // if (!valid) {
  //   if (hasErrors) {
  //     throw new Error('Invalid OpenRPC document.');
  //   }

  //   throw new Error('Invalid data.');
  // }

  // If 'substituteRefs' is set to `true`, each reference ($ref) will be
  // substituted with its resolved value. Otherwise, if 'substituteRefs' is set
  // to `false` and external references exists, the external $ref pointers will
  // be converted to internal $ref pointers.
  const parsed = substituteRefs
    ? await refParser.dereference(data)
    : await refParser.bundle(data);

  return parsed;
};

export { openrpcParse };
