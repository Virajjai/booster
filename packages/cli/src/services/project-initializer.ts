import * as fs from 'fs-extra'
import { command } from 'execa'
import * as Mustache from 'mustache'
import * as path from 'path'
import * as tsConfig from '../templates/project/tsconfig-json'
import * as tsConfigEsLint from '../templates/project/tsconfig.eslint-json'
import * as esLintIgnore from '../templates/project/eslintignore'
import * as esLintRc from '../templates/project/eslintrc-js'
import * as gitIgnore from '../templates/project/gitignore'
import * as packageJson from '../templates/project/package-json'
import * as configTs from '../templates/project/config-ts'
import * as indexTs from '../templates/project/index-ts'
import * as prettierRc from '../templates/project/prettierrc-yaml'
import * as mochaRc from '../templates/project/mocharc-yml'
import * as launchJson from '../templates/project/launch-json'
import { guardError, wrapExecError } from '../common/errors'
import { PackageManagerService } from './package-manager'
import { gen, mapError, pipe, unsafeRunEffect } from '@boostercloud/framework-types/dist/effect'
import { LivePackageManager } from './package-manager/live.impl'

export async function generateConfigFiles(config: ProjectInitializerConfig): Promise<void> {
  await Promise.all(filesToGenerate.map(renderToFile(config)))
}

export async function installDependencies(config: ProjectInitializerConfig): Promise<void> {
  const effect = installDependenciesEff(config)
  return unsafeRunEffect(
    pipe(
      effect,
      mapError((e) => e.error)
    ),
    {
      layer: LivePackageManager,
      onError: guardError('Could not install dependencies'),
    }
  )
}

const installDependenciesEff = (config: ProjectInitializerConfig) =>
  gen(function* ($) {
    const { setProjectRoot, installAllDependencies } = yield* $(PackageManagerService)
    yield* $(setProjectRoot(projectDir(config)))
    yield* $(installAllDependencies())
  })

export async function generateRootDirectory(config: ProjectInitializerConfig): Promise<void> {
  const srcDir = path.join(projectDir(config), 'src')
  const dirs = [
    [srcDir, 'commands'],
    [srcDir, 'common'],
    [srcDir, 'config'],
    [srcDir, 'entities'],
    [srcDir, 'events'],
    [srcDir, 'event-handlers'],
    [srcDir, 'read-models'],
    [srcDir, 'scheduled-commands'],
    [projectDir(config), '.vscode'],
  ]
  await Promise.all(dirs.map(createDirectory))
}

export async function initializeGit(config: ProjectInitializerConfig): Promise<void> {
  try {
    await command('git init && git add -A && git commit -m "Initial commit"', { cwd: projectDir(config), shell: true })
  } catch (e) {
    throw wrapExecError(e, 'Could not initialize git repository')
  }
}

export interface ProjectInitializerConfig {
  projectName: string
  description: string
  version: string
  author: string
  homepage: string
  license: string
  repository: string
  providerPackageName: string
  boosterVersion: string
  default: boolean
  skipInstall: boolean
  skipGit: boolean
}

function renderToFile(templateData: ProjectInitializerConfig): (_: [Array<string>, string]) => Promise<void> {
  return async ([filepath, template]: [Array<string>, string]): Promise<void> => {
    const rendered = Mustache.render(template, templateData)
    const renderPath = path.join(process.cwd(), templateData.projectName, ...filepath)
    return fs.outputFile(renderPath, rendered)
  }
}

export function projectDir(config: ProjectInitializerConfig): string {
  return path.join(process.cwd(), config.projectName)
}

async function createDirectory(paths: string[]): Promise<void> {
  return fs.mkdirs(path.join(...paths))
}

const filesToGenerate: Array<[Array<string>, string]> = [
  [['.eslintignore'], esLintIgnore.template],
  [['.eslintrc.js'], esLintRc.template],
  [['.gitignore'], gitIgnore.template],
  [['package.json'], packageJson.template],
  [['tsconfig.json'], tsConfig.template],
  [['tsconfig.eslint.json'], tsConfigEsLint.template],
  [['.prettierrc.yaml'], prettierRc.template],
  [['src', 'config', 'config.ts'], configTs.template],
  [['src', 'index.ts'], indexTs.template],
  [['.mocharc.yml'], mochaRc.template],
  [['.vscode', 'launch.json'], launchJson.template],
]
