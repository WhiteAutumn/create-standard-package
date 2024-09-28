import path from 'node:path';
import url from 'node:url';

export const fileLocation = (meta: ImportMeta) => {
	const __filename = url.fileURLToPath(meta.url);
	const __dirname = path.dirname(__filename);

	return {
		__filename,
		__dirname
	};
};
