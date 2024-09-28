import process from 'node:process';
import { createInterface } from 'node:readline/promises';

import supportsColor from 'supports-color';

export const useColors = Boolean(supportsColor.stdout);

export const readline = createInterface({
	input:  process.stdin,
	output: process.stdout
});
