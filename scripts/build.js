import fs from 'fs'
import glob from 'glob'
import Promise from 'promise'
import { build } from 'vite'
import stylelint from 'vite-plugin-stylelint'

// load package.json and reset exports
const packageJson = JSON.parse(fs.readFileSync('./package.json'))
packageJson.exports = {}

// get scss files
glob('./src/**/!(_*).scss', async (err, files) => {
	const sources = files.map((input) => {
		const isIndex = input.includes('index.scss')
		const exportName = input.replace(/.\/src\/|.scss|\/index/gm, '')
		const splittedExportName = exportName.split('/')
		const name = splittedExportName.pop()
		const dir = splittedExportName.join('/')
		return {
			exportName,
			name,
			dir,
			input,
			isIndex,
		}
	})

	// build
	await Promise.all(
		sources.map(({ exportName, name, input, dir, isIndex }) => {
			exportName = exportName.replace(/\/style|style/gm, '')
			packageJson.exports[
				`.${exportName ? `/${exportName}` : ``}`
			] = `./dist/${dir ? `${dir}/` : ``}${name}`
			packageJson.exports[
				`./scss${exportName ? `/${exportName}` : ``}`
			] = `./src/${dir ? `${dir}/` : ``}${name}${isIndex ? '/index' : ''}`

			return build({
				plugins: [stylelint()],
				configFile: false,
				build: {
					emptyOutDir: false,
					rollupOptions: {
						input,
						output: {
							dir: `dist/${dir}`,
							assetFileNames: `${name}[extname]`,
						},
					},
				},
			})
		}),
	)

	// sort exports
	packageJson.exports = Object.keys(packageJson.exports)
		.sort((a, b) => (a === '.' ? -1 : b === '.' ? 1 : a > b))
		.reduce((exports, key) => {
			exports[key] = packageJson.exports[key]
			return exports
		}, {})

	fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2))
})
