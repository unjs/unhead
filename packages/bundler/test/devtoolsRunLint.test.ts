import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { runLintRpc } from '../src/devtools/rpc'

const SOURCE = `import { useHead } from 'unhead'\nuseHead({ script: [{ children: 'console.log(1)' }] })\n`

async function createProject(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'unhead-devtools-lint-'))
  await writeFile(join(cwd, 'app.ts'), SOURCE)
  return cwd
}

function runLint(cwd: string, args: Record<string, unknown>) {
  return runLintRpc.setup({ cwd }).handler(args)
}

it('reports source audit findings', async () => {
  const cwd = await createProject()

  const result = await runLint(cwd, { mode: 'audit' })

  expect(result).toMatchObject({ available: true, mode: 'audit', filesFixed: 0 })
  expect(result.files).toEqual([
    expect.objectContaining({
      relativePath: 'app.ts',
      fixed: false,
      messages: expect.arrayContaining([expect.objectContaining({ line: 2 })]),
    }),
  ])
})

it('previews a migration without writing files', async () => {
  const cwd = await createProject()

  const result = await runLint(cwd, { mode: 'migrate', dryRun: true })

  expect(result).toMatchObject({ available: true, dryRun: true, filesFixed: 1 })
  expect(await readFile(join(cwd, 'app.ts'), 'utf8')).toBe(SOURCE)
})

function confirmedFiles(preview: any) {
  return preview.files.filter((f: any) => f.fixed).map((f: any) => ({ filePath: f.filePath, fingerprint: f.fingerprint }))
}

it('writes only the files the user confirmed', async () => {
  const cwd = await createProject()
  const preview = await runLint(cwd, { mode: 'migrate', dryRun: true })
  await writeFile(join(cwd, 'later.ts'), SOURCE)

  const result = await runLint(cwd, { mode: 'migrate', files: confirmedFiles(preview) })

  expect(result).toMatchObject({ available: true, filesFixed: 1 })
  expect(await readFile(join(cwd, 'app.ts'), 'utf8')).toContain(`innerHTML: 'console.log(1)'`)
  expect(await readFile(join(cwd, 'later.ts'), 'utf8')).toBe(SOURCE)
})

it('writes the migration', async () => {
  const cwd = await createProject()

  const result = await runLint(cwd, { mode: 'migrate' })

  expect(result).toMatchObject({ available: true, dryRun: false, filesFixed: 1 })
  expect(await readFile(join(cwd, 'app.ts'), 'utf8')).toContain(`innerHTML: 'console.log(1)'`)
})

it('leaves a confirmed file untouched if its source changes', async () => {
  const cwd = await createProject()
  const preview = await runLint(cwd, { mode: 'migrate', dryRun: true })
  const changed = `${SOURCE}// edited after preview\n`
  await writeFile(join(cwd, 'app.ts'), changed)
  const result = await runLint(cwd, { mode: 'migrate', files: preview.files })
  expect(result.filesFixed).toBe(0)
  expect(await readFile(join(cwd, 'app.ts'), 'utf8')).toBe(changed)
})
