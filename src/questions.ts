import validatePackageName from 'validate-npm-package-name';
import chalk from 'chalk';

import { readline, useColors } from './constants.js';

export const askQuestion = async (question: string, fallback?: string) => {
	const answer = await readline.question(`${question}${fallback != null ? ` (${fallback})` : ""}: `);
	if (answer === "" && fallback != null) {
		return fallback;
	}
	else {
		return answer;
	}
};

export const askYesOrNo = async (question: string, fallback: "yes" | "no") => {
	while (true) {
		const answer = await readline.question(`${question} (${fallback === "yes" ? "Y" : "y"}/${fallback === "no" ? "N" : "n"}): `)
			.then(it => it.toLowerCase());

		if (answer === "y" || answer === "yes") {
			return true;
		}
		else if (answer === "n" || answer === "no") {
			return false;
		}
		else if (answer === "") {
			return fallback === "yes";
		}
	}
};

export const askForPackageName = async () => {
	let packageName: string;
	while (true) {
		packageName = await askQuestion("Package name");
		const validationResult = validatePackageName(packageName);

		for (const error of validationResult.errors ?? []) {
			const textToPrint = `• ${error}`;
			console.error(useColors ? chalk.red(textToPrint) : textToPrint);
		}

		if (validationResult.validForNewPackages) {
			break;
		} else {
			console.log();
		}
	}

	return packageName;
};
