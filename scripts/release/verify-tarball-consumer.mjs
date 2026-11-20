#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { findPackageTarball } from './verify-pack-directory.mjs'

const execute = promisify(execFile)

// 没有发布清单时，装的是当前打出来的包，要检查。
// 有清单时，只有这个包属于本次发布，才检查新契约；其余情况装的是旧基线。
export function shouldVerifyInstalledContract(releaseManifest, packageName) {
  return !releaseManifest || Boolean(releaseManifest.releaseSet?.includes(packageName))
}

function publicRegistryEnvironment() {
  const environment = { ...process.env }
  for (const name of Object.keys(environment)) {
    if (/token|auth|userconfig|globalconfig/i.test(name)) delete environment[name]
  }
  environment.npm_config_audit = 'false'
  environment.npm_config_fund = 'false'
  environment.npm_config_registry = 'https://registry.npmjs.org/'
  return environment
}

const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  await runConsumerVerification()
}

async function runConsumerVerification() {
  const packDirectoryArgument = process.argv[2]
  if (!packDirectoryArgument) throw new Error('Usage: verify-tarball-consumer.mjs <pack-directory>')
  const packDirectory = path.resolve(packDirectoryArgument)
  let releaseManifest
  try {
    releaseManifest = JSON.parse(await readFile(path.join(packDirectory, 'verification-manifest.json'), 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  async function candidateOrBaseline(packageName) {
    if (!releaseManifest) return findPackageTarball(packDirectory, packageName)
    if (releaseManifest?.releaseSet?.includes(packageName)) return findPackageTarball(packDirectory, packageName)
    const baseline = releaseManifest?.compatibilityBaselineSet?.find((item) => item.package === packageName)
    if (!baseline?.filename || !baseline?.integrity || !baseline?.sha256 || !baseline?.packedBytes)
      throw new Error(`exact compatibility baseline is missing for ${packageName}`)
    const baselinePath = path.join(packDirectory, baseline.filename)
    const bytes = await readFile(baselinePath)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const separator = baseline.integrity.indexOf('-')
    const algorithm = baseline.integrity.slice(0, separator)
    const expectedIntegrity = baseline.integrity.slice(separator + 1)
    const actualIntegrity = createHash(algorithm).update(bytes).digest('base64')
    if (sha256 !== baseline.sha256 || actualIntegrity !== expectedIntegrity || bytes.length !== baseline.packedBytes)
      throw new Error(`exact compatibility baseline mismatch for ${packageName}`)
    return baselinePath
  }
  const tarball = await candidateOrBaseline('@yakit-libs/yakit-ui')
  const iconsTarball = await candidateOrBaseline('@yakit-libs/yakit-ui-icons')
  const fixture = await mkdtemp(path.join(tmpdir(), 'yakit-ui-tarball-consumer-'))
  try {
    const emptyNpmConfig = path.join(fixture, 'empty.npmrc')
    await writeFile(emptyNpmConfig, '')
    await writeFile(
      path.join(fixture, 'package.json'),
      `${JSON.stringify({ name: 'yakit-ui-tarball-consumer', private: true, type: 'module' }, null, 2)}\n`,
    )
    await execute(
      'npm',
      [
        'install',
        '--userconfig',
        emptyNpmConfig,
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--package-lock=false',
        '--save-exact',
        tarball,
        iconsTarball,
        '@yakit-libs/color@1.4.1',
        'react@18.3.1',
        'react-dom@18.3.1',
        '@types/react@18.3.24',
        '@types/react-dom@18.3.7',
        'typescript@5.9.2',
        'vite@6.3.5',
      ],
      {
        cwd: fixture,
        env: publicRegistryEnvironment(),
        maxBuffer: 16 * 1024 * 1024,
      },
    )
    await writeFile(
      path.join(fixture, 'index.html'),
      '<!doctype html><html><body><div id="app"></div><script type="module" src="/consumer.mjs"></script></body></html>\n',
    )
    await writeFile(
      path.join(fixture, 'consumer.mjs'),
      'import { applyThemeColors, getColors } from "@yakit-libs/color/preview";\nimport * as YakitUi from "@yakit-libs/yakit-ui";\nimport { HomeOutlined } from "@yakit-libs/yakit-ui-icons";\nimport * as ColorfulIcons from "@yakit-libs/yakit-ui-icons/colorful";\nimport "@yakit-libs/yakit-ui/style.css";\napplyThemeColors("light", getColors("light"));\nwindow.yakitUiExportCount = Object.keys(YakitUi).length + Object.keys(ColorfulIcons).length + Number(Boolean(HomeOutlined));\n',
    )
    await execute(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
      cwd: fixture,
      env: publicRegistryEnvironment(),
      maxBuffer: 16 * 1024 * 1024,
    })
    await access(path.join(fixture, 'dist/index.html'))
    await writeFile(
      path.join(fixture, 'consumer.ts'),
      'import * as YakitUi from "@yakit-libs/yakit-ui";\nimport { HomeOutlined } from "@yakit-libs/yakit-ui-icons";\nimport * as ColorfulIcons from "@yakit-libs/yakit-ui-icons/colorful";\nimport { HomeSolid } from "@yakit-libs/yakit-ui-icons/solid";\nvoid [YakitUi, HomeOutlined, HomeSolid, ColorfulIcons];\n',
    )
    await writeFile(
      path.join(fixture, 'tsconfig.json'),
      `${JSON.stringify(
        {
          compilerOptions: {
            jsx: 'react-jsx',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            noEmit: true,
            skipLibCheck: false,
            strict: true,
            target: 'ES2022',
          },
          files: ['consumer.ts'],
        },
        null,
        2,
      )}\n`,
    )
    await execute(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], {
      cwd: fixture,
      env: publicRegistryEnvironment(),
    })
    await writeFile(
      path.join(fixture, 'ssr-consumer.mjs'),
      [
        'import { createElement } from "react";',
        'import { renderToString } from "react-dom/server";',
        'import { Button, ConfigProvider, Input, InputNumber } from "@yakit-libs/yakit-ui";',
        'const tree = createElement(ConfigProvider, { componentSize: "large", theme: { mode: "dark" } }, createElement("main", null, createElement(Button, null, "Submit"), createElement(Input, { defaultValue: "value" }), createElement(Input.Search, { defaultValue: "query" }), createElement(InputNumber, { defaultValue: 7 })));',
        'const markup = renderToString(tree);',
        'if (!markup.includes("yakit-btn") || !markup.includes("yakit-input") || !markup.includes("yakit-input-number") || markup.includes("ant-")) throw new Error("installed package SSR markup is invalid");',
        'process.stdout.write(markup);',
        '',
      ].join('\n'),
    )
    const { stdout: ssrMarkup } = await execute(process.execPath, ['ssr-consumer.mjs'], {
      cwd: fixture,
      env: publicRegistryEnvironment(),
      maxBuffer: 4 * 1024 * 1024,
    })
    if (!ssrMarkup.includes('yakit-search-input')) {
      throw new Error('installed package SSR smoke did not render Input.Search')
    }

    const installedPackage = path.join(fixture, 'node_modules/@yakit-libs/yakit-ui')
    const installedManifest = JSON.parse(await readFile(path.join(installedPackage, 'package.json'), 'utf8'))
    if (installedManifest.name !== '@yakit-libs/yakit-ui') throw new Error('installed tarball identity mismatch')
    if (shouldVerifyInstalledContract(releaseManifest, '@yakit-libs/yakit-ui')) {
      if (installedManifest.dependencies?.antd !== '^6.6.7')
        throw new Error('installed yakit-ui tarball does not declare antd ^6.6.7')
      const antdManifest = JSON.parse(await readFile(path.join(fixture, 'node_modules/antd/package.json'), 'utf8'))
      if (!/^6\./.test(antdManifest.version)) throw new Error('installed yakit-ui tarball did not resolve antd 6')
    }
    const installedIconsManifest = JSON.parse(
      await readFile(path.join(fixture, 'node_modules/@yakit-libs/yakit-ui-icons/package.json'), 'utf8'),
    )
    if (installedIconsManifest.name !== '@yakit-libs/yakit-ui-icons')
      throw new Error('installed icons tarball identity mismatch')
    if (
      shouldVerifyInstalledContract(releaseManifest, '@yakit-libs/yakit-ui-icons') &&
      (JSON.stringify(installedIconsManifest.peerDependencies) !== JSON.stringify({ react: '^18.2.0 || ^19.0.0' }) ||
        JSON.stringify(installedIconsManifest.dependencies) !== JSON.stringify({ '@yakit-libs/color': '1.4.1' }) ||
        installedIconsManifest.peerDependenciesMeta)
    )
      throw new Error('installed icons tarball color dependency or React peer contract mismatch')
    const installedColorManifest = JSON.parse(
      await readFile(path.join(fixture, 'node_modules/@yakit-libs/color/package.json'), 'utf8'),
    )
    if (
      installedColorManifest.version !== '1.4.1' ||
      !installedColorManifest.exports?.['./preview'] ||
      !installedColorManifest.exports?.['./css']
    )
      throw new Error('installed @yakit-libs/color 1.4.1 exports are invalid')
    const { stdout: colorProbeOutput } = await execute(
      process.execPath,
      [
        '-e',
        'const color = require("@yakit-libs/color"); const light = color.generateColors("light"); const dark = color.generateColors("dark"); process.stdout.write(JSON.stringify({ lightBase: light["--yakit-colors-Neutral-100"], lightToken: light["--Colors-Use-Neutral-Text-1-Title"], darkBase: dark["--yakit-colors-Neutral-80"], darkToken: dark["--Colors-Use-Neutral-Text-1-Title"] }));',
      ],
      { cwd: fixture, env: publicRegistryEnvironment() },
    )
    const colorProbe = JSON.parse(colorProbeOutput)
    if (
      colorProbe.lightBase !== '#353639' ||
      colorProbe.lightToken !== 'var(--yakit-colors-Neutral-100)' ||
      colorProbe.darkBase !== '#c8d0dd' ||
      colorProbe.darkToken !== 'var(--yakit-colors-Neutral-80)'
    )
      throw new Error('installed @yakit-libs/color 1.4.1 token contract is invalid')

    const pnpmFixture = path.join(fixture, 'pnpm-strict-icons')
    await mkdir(pnpmFixture)
    await writeFile(path.join(pnpmFixture, '.npmrc'), 'node-linker=isolated\nhoist=false\n')
    await writeFile(
      path.join(pnpmFixture, 'package.json'),
      `${JSON.stringify({ name: 'yakit-ui-icons-pnpm-consumer', private: true, type: 'module' }, null, 2)}\n`,
    )
    await execute(
      'pnpm',
      [
        'add',
        '--ignore-scripts',
        '--save-exact',
        iconsTarball,
        '@yakit-libs/color@1.4.1',
        'react@18.3.1',
        'vite@6.3.5',
      ],
      {
        cwd: pnpmFixture,
        env: publicRegistryEnvironment(),
        maxBuffer: 16 * 1024 * 1024,
      },
    )
    await writeFile(
      path.join(pnpmFixture, 'index.html'),
      '<!doctype html><html><body><script type="module" src="/consumer.mjs"></script></body></html>\n',
    )
    await writeFile(
      path.join(pnpmFixture, 'consumer.mjs'),
      'import { applyThemeColors, getColors } from "@yakit-libs/color/preview";\nimport { HomeOutlined } from "@yakit-libs/yakit-ui-icons";\nimport * as ColorfulIcons from "@yakit-libs/yakit-ui-icons/colorful";\napplyThemeColors("light", getColors("light"));\nwindow.iconLoaded = Boolean(HomeOutlined) && Object.keys(ColorfulIcons).length > 0;\n',
    )
    await execute(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
      cwd: pnpmFixture,
      env: publicRegistryEnvironment(),
      maxBuffer: 16 * 1024 * 1024,
    })
    await access(path.join(pnpmFixture, 'dist/index.html'))
    const pnpmManifest = JSON.parse(await readFile(path.join(pnpmFixture, 'package.json'), 'utf8'))
    if (pnpmManifest.dependencies?.['@yakit-libs/color'] !== '1.4.1') {
      throw new Error('pnpm consumer must install @yakit-libs/color 1.4.1 directly')
    }
    const cssPath = path.join(installedPackage, 'dist/index.css')
    await access(cssPath)
    if (!(await readFile(cssPath, 'utf8')).trim()) throw new Error('packed CSS export is empty')

    console.log(
      JSON.stringify(
        {
          css: 'passed',
          bundler: 'passed',
          package: `${installedManifest.name}@${installedManifest.version}`,
          iconsPackage: `${installedIconsManifest.name}@${installedIconsManifest.version}`,
          runtimeDependencies: 'passed',
          pnpmStrictLayout: 'passed',
          ssr: 'passed',
          typescript: 'passed',
        },
        null,
        2,
      ),
    )
  } finally {
    await rm(fixture, { force: true, recursive: true })
  }
}
