#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires, no-continue, prefer-destructuring */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, '.skillshare', 'agent-context.config.json');
const rootManifestPath = path.join(rootDir, 'package.json');
const allowedSkillEntries = new Set(['SKILL.md', 'agents', 'assets', 'references', 'scripts']);
const allowedFrontmatterKeys = new Set(['description', 'name']);

function relative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function fail(errors, message) {
  errors.push(message);
}

function readJson(filePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(errors, `${relative(filePath)}: ${error.message}`);
    return null;
  }
}

function parseFrontmatter(source, displayPath, errors) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match) {
    fail(errors, `${displayPath}: missing or malformed YAML frontmatter`);
    return { body: source, fields: {} };
  }

  const fields = {};
  for (const line of match[1].split(/\r?\n/u)) {
    const fieldMatch = /^([a-z-]+):\s*(.+)$/u.exec(line);
    if (!fieldMatch) {
      fail(errors, `${displayPath}: unsupported multiline or malformed frontmatter: ${line}`);
      continue;
    }
    const [, key, rawValue] = fieldMatch;
    if (!allowedFrontmatterKeys.has(key)) {
      fail(errors, `${displayPath}: unsupported frontmatter key: ${key}`);
      continue;
    }
    fields[key] = rawValue.replace(/^(['"])(.*)\1$/u, '$2').trim();
  }

  return {
    body: source.slice(match[0].length),
    fields,
  };
}

function collectMarkdownFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files;
}

function validateMarkdownLinks(filePath, errors) {
  const source = fs.readFileSync(filePath, 'utf8');
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu;
  for (const match of source.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/gu, '');
    const target = rawTarget.split('#')[0];
    if (!target || /^(?:data:|https?:|mailto:|skill:|\/)/iu.test(target)) {
      continue;
    }

    let decodedTarget;
    try {
      decodedTarget = decodeURIComponent(target);
    } catch {
      fail(errors, `${relative(filePath)}: invalid link: ${rawTarget}`);
      continue;
    }

    if (!fs.existsSync(path.resolve(path.dirname(filePath), decodedTarget))) {
      fail(errors, `${relative(filePath)}: missing relative link: ${rawTarget}`);
    }
  }
}

function validateDocumentedYarnCommands(filePath, errors) {
  const source = fs.readFileSync(filePath, 'utf8');
  const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf8'));
  const rootScripts = rootManifest.scripts || {};
  const binaryDirectory = path.join(rootDir, 'node_modules', '.bin');
  const commandPattern = /\byarn(?:\s+--cwd\s+([^\s;&|`]+))?\s+([a-zA-Z0-9][a-zA-Z0-9:_-]*)/gu;

  for (const [index, line] of source.split(/\r?\n/u).entries()) {
    for (const match of line.matchAll(commandPattern)) {
      const packageDirectory = match[1];
      const command = match[2];
      if (match[0].includes('<') || match[0].includes('$')) {
        continue;
      }

      if (packageDirectory) {
        const manifestPath = path.resolve(rootDir, packageDirectory, 'package.json');
        if (!fs.existsSync(manifestPath)) {
          fail(
            errors,
            `${relative(filePath)}:${
              index + 1
            }: documented package does not exist: ${packageDirectory}`
          );
          continue;
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (!manifest.scripts?.[command]) {
          fail(
            errors,
            `${relative(filePath)}:${
              index + 1
            }: package ${packageDirectory} has no "${command}" script`
          );
        }
      } else if (
        !rootScripts[command] &&
        !fs.existsSync(path.join(binaryDirectory, command)) &&
        !fs.existsSync(path.join(binaryDirectory, `${command}.cmd`))
      ) {
        fail(
          errors,
          `${relative(filePath)}:${index + 1}: root package has no "${command}" script or binary`
        );
      }
    }
  }
}

function addBudgetError(errors, label, actual, maximum) {
  if (actual > maximum) {
    fail(errors, `${label}: ${actual} exceeds budget ${maximum}`);
  }
}

function main() {
  const errors = [];
  const config = readJson(configPath, errors);
  if (!config) {
    return errors;
  }

  if (config.schemaVersion !== 1) {
    fail(errors, `Unsupported agent-context schema: ${config.schemaVersion}`);
  }

  const budgets = config.budgets;
  const skillsDirectory = path.resolve(rootDir, config.skillsDirectory);
  const projectInstructionFiles = config.projectInstructionFiles || [];
  const projectMarkdownFiles = config.projectMarkdownFiles || [];

  let projectInstructionBytes = 0;
  for (const instructionPath of projectInstructionFiles) {
    const filePath = path.resolve(rootDir, instructionPath);
    if (!fs.existsSync(filePath)) {
      fail(errors, `${instructionPath}: project instruction file does not exist`);
      continue;
    }
    projectInstructionBytes += fs.statSync(filePath).size;
  }
  addBudgetError(
    errors,
    'project instruction bytes',
    projectInstructionBytes,
    budgets.maxProjectInstructionBytes
  );

  for (const markdownPath of projectMarkdownFiles) {
    const filePath = path.resolve(rootDir, markdownPath);
    if (!fs.existsSync(filePath)) {
      fail(errors, `${markdownPath}: configured Markdown file does not exist`);
    } else {
      validateMarkdownLinks(filePath, errors);
      validateDocumentedYarnCommands(filePath, errors);
    }
  }

  if (!fs.existsSync(skillsDirectory)) {
    fail(errors, `${config.skillsDirectory}: skills directory does not exist`);
    return errors;
  }

  const skillDirectories = fs
    .readdirSync(skillsDirectory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .toSorted((left, right) => left.name.localeCompare(right.name));

  let implicitDescriptionCharacters = 0;
  let implicitSkills = 0;
  let totalDescriptionCharacters = 0;

  for (const skillEntry of skillDirectories) {
    const skillDirectory = path.join(skillsDirectory, skillEntry.name);
    const skillFile = path.join(skillDirectory, 'SKILL.md');
    const entries = fs.readdirSync(skillDirectory);

    for (const entry of entries) {
      if (!allowedSkillEntries.has(entry)) {
        fail(errors, `${relative(path.join(skillDirectory, entry))}: unsupported skill entry`);
      }
    }

    if (!fs.existsSync(skillFile)) {
      fail(errors, `${relative(skillDirectory)}: missing SKILL.md`);
      continue;
    }

    const source = fs.readFileSync(skillFile, 'utf8');
    const { body, fields } = parseFrontmatter(source, relative(skillFile), errors);
    const name = fields.name;
    const description = fields.description;

    if (name !== skillEntry.name || !/^[a-z0-9-]{1,64}$/u.test(name || '')) {
      fail(errors, `${relative(skillFile)}: name must match its hyphen-case folder`);
    }
    if (!description) {
      fail(errors, `${relative(skillFile)}: description must be non-empty`);
    }

    const descriptionLength = description?.length || 0;
    totalDescriptionCharacters += descriptionLength;

    const policyPath = path.join(skillDirectory, 'agents', 'openai.yaml');
    const policySource = fs.existsSync(policyPath) ? fs.readFileSync(policyPath, 'utf8') : '';
    const explicitOnly = /allow_implicit_invocation:\s*false\b/u.test(policySource);
    if (explicitOnly) {
      addBudgetError(
        errors,
        `${relative(skillFile)} explicit description characters`,
        descriptionLength,
        budgets.maxExplicitDescriptionCharactersPerSkill
      );
    } else {
      implicitSkills += 1;
      implicitDescriptionCharacters += descriptionLength;
      addBudgetError(
        errors,
        `${relative(skillFile)} implicit description characters`,
        descriptionLength,
        budgets.maxImplicitDescriptionCharactersPerSkill
      );
    }

    addBudgetError(
      errors,
      `${relative(skillFile)} body lines`,
      body.split(/\r?\n/u).length,
      budgets.maxSkillBodyLines
    );

    for (const markdownFile of collectMarkdownFiles(skillDirectory)) {
      validateMarkdownLinks(markdownFile, errors);
      validateDocumentedYarnCommands(markdownFile, errors);
    }
  }

  addBudgetError(
    errors,
    'discoverable skills',
    skillDirectories.length,
    budgets.maxDiscoverableSkills
  );
  addBudgetError(errors, 'implicit skills', implicitSkills, budgets.maxImplicitSkills);
  addBudgetError(
    errors,
    'total description characters',
    totalDescriptionCharacters,
    budgets.maxTotalDescriptionCharacters
  );
  addBudgetError(
    errors,
    'implicit description characters',
    implicitDescriptionCharacters,
    budgets.maxImplicitDescriptionCharacters
  );

  if (errors.length === 0) {
    console.log(
      `PASS agent context: ${skillDirectories.length} skills, ${implicitSkills} implicit, ` +
        `${projectInstructionBytes} instruction bytes`
    );
  }

  return errors;
}

const errors = main();
if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
}
