import type { Dirent } from 'node:fs';

import path from 'node:path';
import fs from 'node:fs/promises';
import child_process from 'node:child_process';
import util from 'node:util';

import { fileLocation } from './util.js';

const exec = util.promisify(child_process.exec);

const { __dirname } = fileLocation(import.meta);
const templateDir = path.join(__dirname, '..', 'template');
const templateFilesPromise = fs.readdir(templateDir, { withFileTypes: true });

const voltaExistsPromise = exec('volta --version')
	.then(() => true)
	.catch(() => false);

type Files = {
	[K: string]: string | Files;
};

type UserTemplateVariables = {
	PACKAGE_NAME:        string;
	PACKAGE_DESCRIPTION: string;
	PACKAGE_AUTHOR:      string;
	COPYRIGHT_HOLDER:    string;

	USE_GITHUB:              boolean;
	GITHUB_USERNAME?:        string;
	GITHUB_REPOSITORY_NAME?: string;
};

type TemplateVariables = UserTemplateVariables & {
	USE_VOLTA:    boolean;
	CURRENT_YEAR: string;
};

export const createPackageFromTemplate = async (location: string, userVariables: UserTemplateVariables) => {
	const resolvedLocation = path.resolve(location);

	const variables: TemplateVariables = {
		...userVariables,

		USE_VOLTA:    await voltaExistsPromise,
		CURRENT_YEAR: String(new Date().getFullYear())
	};

	const locationDirCreationPromise = fs.mkdir(resolvedLocation, { recursive: true });
	const processedDirectoryPromise = processDirectory(templateFilesPromise, variables);

	const [processedDirectory] = await Promise.all([
		processedDirectoryPromise,
		locationDirCreationPromise
	]);

	await writeDirectory(resolvedLocation, processedDirectory);

	if (await voltaExistsPromise) {
		await exec('volta pin node@lts', {
			cwd: resolvedLocation
		});
	}
};

const processDirectory = async (entriesPromise: Promise<Dirent[]>, variables: TemplateVariables): Promise<Files> => {
	const entires = await entriesPromise;
	const files: Files = {};
	
	let fileMap: Record<string, string | undefined> = {};
	const fileMapEntry = entires.find(it => it.name === '.$file-map.json');
	if (fileMapEntry?.isFile() === true) {
		fileMap = await fs.readFile(path.join(fileMapEntry.path, fileMapEntry.name))
			.then(it => it.toString('utf-8'))
			.then(it => JSON.parse(it));
	}

	for (const entry of entires) {
		if (entry.name.startsWith('.$')) {
			continue;
		}

		const destinationName = fileMap[entry.name] ?? entry.name;

		if (entry.isFile()) {
			const rawContent = await fs.readFile(path.join(entry.path, entry.name))
				.then(it => it.toString('utf-8'));

			const expandedContent = processMacros(rawContent, variables);

			files[destinationName] = expandedContent;
		}

		if (entry.isDirectory()) {
			files[destinationName] = await processDirectory(fs.readdir(path.join(entry.path, entry.name), { withFileTypes: true }), variables);
		}
	}

	return files;
};

const writeDirectory = async (destination: string, files: Files, destinationExists = true) => {
	if (!destinationExists) {
		await fs.mkdir(destination);
	}

	const promises: Array<Promise<unknown>> = [];
	for (const [fileName, fileContent] of Object.entries(files)) {
		if (typeof fileContent === 'string') {
			promises.push(fs.writeFile(path.join(destination, fileName), fileContent));
		}

		if (typeof fileContent === 'object') {
			promises.push(writeDirectory(path.join(destination, fileName), fileContent, false));
		}
	}

	await Promise.all(promises);
};

const ifndefMacroPattern = /\s*\/\/\s*#IF\s+(?<condition>[\w-]+)\n.*?\s*\/\/\s*#ENDIF\n?/gs;
const stripCommentsPattern = /^\s*\/\/.*$/gm;
const substitutionMacroPattern = /%(?<variable>\w+)%/gm;
const processMacros = (file: string, variables: TemplateVariables) => {
	let processedFile = file;

	processedFile = processedFile.replace(ifndefMacroPattern, (part, arg) => {
		type VariableKey = keyof typeof variables;
		const condition = <VariableKey> arg;

		if (condition in variables === false) {
			throw new Error(`The variable ${condition} does not exist!`);
		}

		if (typeof variables[condition] !== 'boolean') {
			throw new Error(`Expected ${condition} to be boolean but found ${typeof variables[condition]}!`);
		}

		if (variables[condition]) {
			return part.replace(stripCommentsPattern, '');
		}
		
		return '';
	});

	processedFile = processedFile.replace(substitutionMacroPattern, (_, arg) => {
		type VariableKey = keyof typeof variables;
		const variable = <VariableKey> arg;

		if (variable in variables === false) {
			throw new Error(`The variable ${variable} does not exist!`);
		}

		if (typeof variables[variable] !== 'string') {
			throw new Error(`Expected ${variable} to be string but found ${typeof variables[variable]}!`);
		}

		return variables[variable];
	});

	return processedFile;
};
