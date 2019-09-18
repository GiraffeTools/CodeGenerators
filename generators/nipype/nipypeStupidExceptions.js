import {iterableCode, mapNodeFields} from './nipype';

const LANGUAGE = 'Nipype';

export const exceptionNodes = [
  'utility.IdentityInterface()',
  'io.SelectFiles()',
  'io.MySQLSink()',
  'io.SQLiteSink()',
  'io.S3DataGrabber()',
  'io.DataGrabber()',
];

export const exceptionCode = (node, links) => {
  const codeArgument =
    node.code && node.code.find((a) => a.language === LANGUAGE);

  if (codeArgument.argument.name === 'utility.IdentityInterface()') {
    return codeForIdentityInterface(node, links);
  }
  if (codeArgument.argument.name === 'io.SelectFiles()') {
    return codeForSelectFiles(node, links);
  }
  if (codeArgument.argument.name === 'io.MySQLSink()') {
    return codeForMySQLSink(node, links);
  }
  if (codeArgument.argument.name === 'io.SQLiteSink()') {
    return codeForSQLiteSink(node, links);
  }
  if (codeArgument.argument.name === 'io.S3DataGrabber()') {
    return codeForS3DataGrabber(node, links);
  }
  if (codeArgument.argument.name === 'io.DataGrabber()') {
    return codeForDataGrabber(node, links);
  }
  return '';
};

export const codeForIdentityInterface = (node, links) => {
  const codeArgument =
    node.code && node.code.find((a) => a.language === LANGUAGE);

  let code = `#${codeArgument.comment}\r\n`;
  const iteratorFields = mapNodeFields(node);
  // let nodeType = iteratorFields.length ? "MapNode" : "Node";
  // #TODO condition on baing iterable
  const nodeType = 'Node'; // #TODO condition on being iterable

  const fieldNodes =
    node.parameters &&
    node.parameters
        .filter((parameter) => parameter.input && parameter.output)
        .map((parameter) => parameter.name);

  const givenName = node.name;
  code += `${givenName} = pe.${nodeType}`;
  code += `(utility.IdentityInterface(fields=["${fieldNodes.join(
      '", "'
  )}"]), name='${givenName}'`;
  if (iteratorFields.length) {
    code += `, iterfield = ['${iteratorFields.join('\',\'')}']`;
  }
  code += `)\r\n`;
  code += iterableCode(node, links);
  return code;
};

export const codeForSelectFiles = (node, links) => {
  const codeArgument =
    node.code && node.code.find((a) => a.language === LANGUAGE);

  let code = `#${codeArgument.comment}\r\n`;
  const iteratorFields = mapNodeFields(node);
  // let nodeType = iteratorFields.length ? "MapNode" : "Node";
  // #TODO condition on baing iterable
  const nodeType = 'Node'; // #TODO condition on being iterable
  const givenName = node.name;
  code += `${givenName} = pe.${nodeType}`;

  const templateDictionary =
    node.parameters &&
    node.parameters
        .filter(
            (parameter) => parameter.input && parameter.output &&
            parameter.value
        )
        .map((parameter) => `'${parameter.name}':${parameter.value}`);

  code += `(io.SelectFiles(templates={${templateDictionary.join()
  }}), name='${givenName}'`;
  if (iteratorFields.length) {
    code += `, iterfield = ['${iteratorFields.join('", "')}']`;
  }
  code += `)\r\n`;
  code += iterableCode(node, links);
  return code;
};

export const codeForMySQLSink = (node, links) => {
  const codeArgument =
    node.code && node.code.find((a) => a.language === LANGUAGE);

  let code = `#${codeArgument.comment}\r\n`;
  const iteratorFields = mapNodeFields(node);
  // #TODO condition on baing iterable

  const fieldNodes =
    node.parameters &&
    node.parameters
        .filter((parameter) => parameter.input && parameter.output)
        .map((parameter) => parameter.name);

  const givenName = node.name;
  code += `(io.MySQLSink(fields=['${fieldNodes.join(
      ','
  )}']), name='${givenName}'`;
  if (!iteratorFields.length) {
    code += `, iterfield = ['${iteratorFields.join(`', '`)}']`;
  }
  code += `)\r\n`;
  code += iterableCode(node, links);
  return code;
};

export const codeForSQLiteSink = (node, links) => {
  const codeArgument =
    node.code && node.code.find((a) => a.language === LANGUAGE);

  let code = `#${codeArgument.comment}\r\n`;
  const iteratorFields = mapNodeFields(node);
  // #TODO condition on baing iterable

  const fieldNodes =
    node.parameters &&
    node.parameters
        .filter((parameter) => parameter.input && parameter.output)
        .map((parameter) => parameter.name);

  const givenName = node.name;
  code += `(utility.SQLiteSink(fields=['${fieldNodes.join(
      ','
  )}']), name='${givenName}'`;
  if (!iteratorFields.length) {
    code += `, iterfield = ['${iteratorFields.join(`', '`)}']`;
  }
  code += `)\r\n`;
  code += iterableCode(node, links);
  return code;
};

export const codeForS3DataGrabber = (node, links) => {
  const standardPorts = [
    'anon',
    'region',
    'bucket',
    'bucket_path',
    'local_directory',
    'raise_on_empty',
    'sort_filelist',
    'template',
    'template_args',
    'ignore_exception',
  ];

  const infields = node.parameters
      .filter((p) => p.input)
      .filter((p) => !standardPorts.includes(p.name))
      .map((p) => p.name);

  const outfields = node.parameters
      .filter((p) => p.output)
      .filter((p) => !standardPorts.includes(p.name))
      .map((p) => p.name);

  const codeArgument =
    node.code && node.code.find((a) => a.language === LANGUAGE);

  let code = `#${codeArgument.comment}\r\n`;
  const iteratorFields = mapNodeFields(node);
  const nodeType = iteratorFields.length ? 'MapNode' : 'Node';
  // #TODO condition on baing iterable
  const givenName = node.name;
  code += `${givenName} = pe.${nodeType}(io.S3DataGrabber(`;
  if (infields.length) code += `infields=["${infields.join('", "')}"]`;
  if (infields.length && outfields.length) code += ', ';
  if (outfields.length) code += `outfields=["${outfields.join('", "')}"]`;
  code += `), name = '${givenName}'`;
  if (!iteratorFields.length) {
    code += ')\r\n';
  } else {
    `, iterfield = ['${iteratorFields.join('", "')}'])\n`;
  }

  code += iterableCode(node, links);
  return code;
};

export const codeForDataGrabber = (node, links) => {
  const standardPorts = [
    'sort_filelist',
    'template',
    'base_directory',
    'raise_on_empty',
    'drop_blank_outputs',
    'template_args',
  ];

  const infields = node.parameters
      .filter((p) => p.input)
      .filter((p) => !standardPorts.includes(p.name))
      .map((p) => p.name);

  const outfields = node.parameters
      .filter((p) => p.output)
      .filter((p) => !standardPorts.includes(p.name))
      .map((p) => p.name);

  const codeArgument =
    node.code && node.code.find((a) => a.language === LANGUAGE);

  let code = `#${codeArgument.comment}\r\n`;
  const iteratorFields = mapNodeFields(node);
  const nodeType = iteratorFields.length ? 'MapNode' : 'Node';
  // #TODO condition on baing iterable
  const givenName = node.name;
  code += `${givenName} = pe.${nodeType}(io.DataGrabber(`;
  if (infields.length) code += `infields=["${infields.join('", "')}"]`;
  if (infields.length && outfields.length) code += ', ';
  if (outfields.length) code += `outfields=["${outfields.join('", "')}"]`;
  code += `), name = '${givenName}'`;
  if (!iteratorFields.length) {
    code += ')\r\n';
  } else {
    `, iterfield = ['${iteratorFields.join('", "')}'])\n`;
  }

  code += iterableCode(node, links);
  return code;
};
