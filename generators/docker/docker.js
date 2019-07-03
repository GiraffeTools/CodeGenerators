import to from "await-to-js";

const LANGUAGE = "Docker";

const codeMappings = {};
async function toolboxCode(toolbox) {
  if (!Object.keys(codeMappings).includes(toolbox)) {
    const code = await fetch(`/static/assets/neurodocker/${toolbox}.txt`);
    codeMappings[toolbox] = await code.text();
  }
  return codeMappings[toolbox];
}

async function nodeCode(nodes) {
  const dockerCodes =
    nodes &&
    nodes.map(
      node => node.code && node.code.find(a => a.language === LANGUAGE)
    );

  const languagesInEditor = dockerCodes.map(
    code => code.argument && code.argument.name && code.argument.name.split(",")
  );

  const availableToolboxes = [
    "afni",
    "ants",
    "freesurfer",
    "fsl",
    "mrtrix",
    "Nipype",
    "spm"
  ];
  const toolboxes = [
    ...new Set(
      languagesInEditor.filter(l => l).reduce((acc, val) => acc.concat(val), [])
    )
  ]
    .map(language => language.replace(/\s/g, ""))
    .filter(toolbox => availableToolboxes.includes(toolbox));

  const code = await Promise.all(
    toolboxes.map(toolbox => toolboxCode(toolbox))
  );

  const customSnippets = dockerCodes
    .map(code => code.argument && code.argument.snippet)
    .filter(s => s != null);

  const snippetCode = await Promise.all(
    [...new Set(customSnippets)].map(async snippet =>
      (await fetch(snippet)).text()
    )
  );

  return code.concat(snippetCode).join("\r\n");
}

export async function writeCode(nodes, links) {
  const [error1, code] = await to(nodeCode(nodes));
  if (error1) return "Dockerfile cannot be generated";
  const [error2, dockerComponents] = await to(
    Promise.all([
      toolboxCode("preamble"), // This is currently a Nipype preamble
      code,
      toolboxCode("postamble") // This is currently a Nipype postamble
    ])
  );
  if (error2) return "Dockerfile cannot be generated";
  return dockerComponents.join("\r\n");
}

export async function writeFiles(nodes, links) {
  const docker_file = "GIRAFFE/code/Dockerfile";
  const docker_compose_file = "GIRAFFE/code/docker-compose.yml";
  const empty_file_temp = "GIRAFFE/code/temp/.empty";
  const empty_file_output = "GIRAFFE/code/output/.empty";

  return {
    [docker_file]: await writeCode(nodes),
    [docker_compose_file]: await (await fetch(
      "/static/assets/misc/docker-compose.yml"
    )).text(),
    [empty_file_temp]: await (await fetch(
      "/static/assets/misc/empty.txt"
    )).text(),
    [empty_file_output]: await (await fetch(
      "/static/assets/misc/empty.txt"
    )).text()
  };
}
