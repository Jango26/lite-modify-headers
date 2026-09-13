// 把 build 产物 dist/ 打成可上传应用商店的 zip，文件名带 manifest 里的版本号。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const outDir = resolve(root, 'release')

if (!existsSync(dist)) {
    console.error('dist/ 不存在，先跑 npm run build')
    process.exit(1)
}

const { name, version } = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'))
const zipName = `${name.toLowerCase().replace(/\s+/g, '-')}-${version}.zip`
const zipPath = resolve(outDir, zipName)

mkdirSync(outDir, { recursive: true })
rmSync(zipPath, { force: true })

// -r 递归，-X 不写 macOS 扩展属性，避免商店审核看到多余的 __MACOSX 之类的条目
execFileSync('zip', ['-r', '-X', zipPath, '.'], { cwd: dist, stdio: 'inherit' })

console.log(`\n打包完成：release/${zipName}`)
