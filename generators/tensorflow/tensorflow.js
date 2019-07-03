const LANGUAGE = "Tensorflow";

const newline = `
`;
const indent = n => " ".repeat(n);
function capitaliseFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const writePreamble = nodes => {
  const header = `'''
Created by the GiraffeTools Tensorflow generator.
Warning, here be dragons.

'''`;

  const moduleImports = newline + newline + "import tensorflow as tf";
  const imports =
    nodes &&
    nodes.map(node => {
      const codeArgument =
        node.code && node.code.find(a => a.language === LANGUAGE);
      return (
        codeArgument &&
        codeArgument.argument &&
        `${codeArgument.argument.import}`
      );
    });

  const model = `
# Model
def NeuralNet(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
  ):
`;

  return [
    header,
    moduleImports,
    [...new Set(imports)].join("\r\n"),
    model
  ].join("\r\n");
};

const writeNodes = (nodes, links) => {
  const inputs = links.map(link => link.portTo.id);
  const first_node = nodes.find(node => {
    const input = node.parameters.find(
      parameter => parameter.input && parameter.name === ""
    );
    // if the input port is not connected, it's the first
    return input && !inputs.includes(input.input);
  });

  if (!first_node) return null;

  const getChild = nodeId => {
    const link = links.find(link => link.portFrom.node.id === nodeId);
    return link && link.portTo.node.id;
  };
  const nodeSequence = [first_node.id];
  let child = getChild(first_node.id);
  while (child && !nodeSequence.includes(child)) {
    nodeSequence.push(child);
    child = getChild(child);
  }

  const nodeList = nodeSequence.map(id => nodes.find(node => node.id === id));
  const code =
    nodeList.length &&
    nodeList
      .map((node, index) => {
        const previousNodeName =
          nodeList[index - 1] && nodeList[index - 1].name;
        return itemToCode(node, previousNodeName);
      })
      .filter(code => code !== null);
  return code && code.join("\r\n");
};

const argFromParam = parameter => {
  const code =
    parameter.code &&
    parameter.code.length &&
    parameter.code.find(a => a.language === LANGUAGE);
  return code && code.argument;
};

const itemToCode = (node, previousNodeName) => {
  const codeArgument =
    node.code &&
    node.code.length &&
    node.code.find(a => a.language === LANGUAGE);
  if (!codeArgument) {
    return null;
  }

  let code = "";

  const { parameters } = node;
  const nodeName = node.name.toLowerCase();
  code += indent(4) + `${nodeName} = ${codeArgument.argument.name}(` + newline;

  let args, kwargs;
  args =
    parameters &&
    parameters
      // filter the positional arguments
      .filter(parameter => {
        const argument = argFromParam(parameter);
        return (
          argument &&
          typeof argument.arg === "number" &&
          parameter.name !== undefined
        );
      })
      // sort them by position, just to be sure
      .sort((a, b) => argFromParam(a).arg < argFromParam(b).arg)
      // fill in the values
      .map(
        parameter => `${indent(6)}${parameter.value || "#mandatory argument"}`
      )
      // join them up, comma separated
      .join("," + newline);

  kwargs =
    parameters &&
    parameters
      // filter the keyword arguments
      .filter(parameter => {
        const argument = argFromParam(parameter);
        return (
          argument &&
          argument.kwarg &&
          parameter.name !== undefined &&
          parameter.value !== undefined &&
          parameter.value !== ""
        );
      })
      // fill in the values
      .map(parameter => {
        const argument = argFromParam(parameter);
        const value =
          typeof parameter.value === "boolean"
            ? capitaliseFirstLetter(`${parameter.value}`)
            : parameter.value;
        return `${indent(6)}${parameter.name}=${value}`;
      })
      // join them up, comma separated
      .join("," + newline);

  const name = indent(6) + `name='${nodeName}'`;
  if (args !== "") code += args + "," + newline;
  if (kwargs !== "") code += kwargs + "," + newline;
  code += name + newline + indent(4) + ")";

  if (previousNodeName) code += `(${previousNodeName})`;
  code += newline;

  return code;
};

const writePostamble = (nodes, links) => {
  const inputs = links.map(link => link.portTo.id);
  const first_node = nodes.find(node => {
    const input = node.parameters.find(
      parameter => parameter.input && parameter.name === ""
    );
    // if the input port is not connected, it's the first
    return input && !inputs.includes(input.input);
  });

  if (!first_node) return null;

  const getChild = nodeId => {
    const link = links.find(link => link.portFrom.node.id === nodeId);
    return link && link.portTo.node.id;
  };
  const nodeSequence = [first_node.id];
  let child = getChild(first_node.id);
  while (child && !nodeSequence.includes(child)) {
    nodeSequence.push(child);
    child = getChild(child);
  }
  const last_node = child;

  const createModel =
    newline +
    `    # Creating model
    _model = tf.keras.models.Model(
      inputs  = [${first_node.name}],
      outputs = [${nodes.find(node => node.id == nodeSequence.slice(-1)).name}]
    )
`;
  const compileModel = `
    _model.compile(
      optimizer = optimizer,
      loss      = loss,
      metrics   = metrics
    )
`;

  const returnModel = `
    # Returning model
    return _model
`;

  return createModel + compileModel + returnModel;
};

export function writeCode(nodes, links) {
  const preamble = writePreamble(nodes);
  const nodeCode = writeNodes(nodes, links);
  const postAmble = writePostamble(nodes, links);
  return [preamble, nodeCode, postAmble].join("\r\n");
}

export function writeFiles(nodes, links) {
  const python_file = "GIRAFFE/code/neural_net.py";
  const init_file = "GIRAFFE/code/__init__.py";

  return {
    [python_file]: writeCode(nodes, links),
    [init_file]: ""
  };
}
