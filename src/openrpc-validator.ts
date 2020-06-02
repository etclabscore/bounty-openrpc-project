import * as Ajv from 'ajv';
import * as openRpcSchema from './openrpc-meta-schema/1.11.0/open-rpc-meta-schema.json';

const ajv = new Ajv({
  allErrors: true,
  logger: false,

  validateSchema: false,
  missingRefs: 'ignore',
});

const ajvValidate = ajv.compile(openRpcSchema);

const openrpcValidate = (
  data: any
): { valid: boolean; errors: Ajv.ErrorObject[]; hasErrors: boolean } => {
  const valid = ajvValidate(data);

  let errors: Ajv.ErrorObject[] = [];
  if (ajvValidate.errors !== null && ajvValidate.errors !== undefined) {
    errors = ajvValidate.errors;
  }

  return {
    valid: valid ? true : false,

    hasErrors: errors.length !== 0,
    errors,
  };
};

export { openrpcValidate };
