// 发版：先构建确认能过，再升版本号，最后打 zip。不碰 git。
// 用法：npm run release [patch|minor|major|x.y.z]，默认 patch
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['manifest.json', 'package.json'].map((file) => resolve(root, file));

function bump(current, arg) {
    if (/^\d+\.\d+\.\d+$/.test(arg)) return arg;

    const parts = current.split('.').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        throw new Error(`当前版本号 ${current} 不是 x.y.z，只能显式传新版本号`);
    }

    const [major, minor, patch] = parts;
    if (arg === 'major') return `${major + 1}.0.0`;
    if (arg === 'minor') return `${major}.${minor + 1}.0`;
    if (arg === 'patch') return `${major}.${minor}.${patch + 1}`;
    throw new Error(`无法识别的版本参数 ${arg}，用 patch / minor / major 或 x.y.z`);
}

function writeVersion(file, version) {
    const text = readFileSync(file, 'utf8');
    // 只替换第一处 "version"，避免动到依赖里同名的字段
    const next = text.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`);
    if (next === text) throw new Error(`${file} 里没找到 version 字段`);
    writeFileSync(file, next);
}

const run = (script) => execFileSync('npm', ['run', script], {cwd: root, stdio: 'inherit'});

const current = JSON.parse(readFileSync(targets[0], 'utf8')).version;
const version = bump(current, process.argv[2] ?? 'patch');

console.log(`构建检查（${current} → ${version}）...`);
run('build');

for (const file of targets) writeVersion(file, version);
console.log(`\n版本号已更新为 ${version}`);

// 走 zip 而不是直接调 zip.mjs：上面那次 build 用的是旧版本号，
// dist/manifest.json 里的 version 得靠这次重建才对得上
run('zip');
