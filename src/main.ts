#!/usr/bin/env node

import { readline } from "./constants.js";
import { createPackageFromTemplate } from "./creator.js";
import { askForPackageName, askQuestion, askYesOrNo } from "./questions.js";

const packageName = await askForPackageName();
const packageDescription = await askQuestion("Package description");
const packageAuthor = await askQuestion("Package author");
const copyrightHolder = await askQuestion("License holder");

const useGithub = await askYesOrNo("Github?", "yes");
let githubUser: string | undefined;
let githubRepositoryName: string | undefined;
if (useGithub) {
	githubUser = await askQuestion("Github user", packageAuthor);
	githubRepositoryName = await askQuestion("Github repository", packageName);
}

const packageLocation = await askQuestion("Where?", `./${packageName}`);

await createPackageFromTemplate(packageLocation, {
	PACKAGE_NAME: packageName,
	PACKAGE_DESCRIPTION: packageDescription,
	PACKAGE_AUTHOR: packageAuthor,
	COPYRIGHT_HOLDER: copyrightHolder,

	USE_GITHUB: useGithub,
	...(useGithub ? {
		GITHUB_USERNAME: githubUser,
		GITHUB_REPOSITORY_NAME: githubRepositoryName
	} : {}),
});

readline.close();
