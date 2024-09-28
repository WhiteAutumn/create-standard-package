// @ts-check

import autumn from '@autumn.dev/eslint-config';

export default [
	...autumn({
		typescript: true
	}),
	{
		ignores: [
			'dist/*'
		]
	}
];
