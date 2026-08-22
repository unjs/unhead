import type { PerfRun } from './perf-report'
import fs from 'node:fs'
import process from 'node:process'
import { collectBundleData, renderBundleReport } from './bundle-report'
import { renderDependencyReport } from './dependency-report'
import { parseVitestBenchmarks, renderPerfReport } from './perf-report'
import { renderPrecompileReport } from './precompile-report'

// Combined bundle, dependency, and perf comment for the PR. Bundle data comes
// from the dist dirs; dependency and perf data come from JSON generated for the
// base and PR builds.
const bundleData = collectBundleData()
const sections: string[] = [renderBundleReport(bundleData.filter(item => !item.comparison))]

function readJson(p?: string) {
  return p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
}

const prDependencies = readJson(process.env.PR_DEPENDENCIES)
if (prDependencies?.packages?.length)
  sections.push(renderDependencyReport(readJson(process.env.BASE_DEPENDENCIES), prDependencies))

function mergePerfRuns(...runs: Array<PerfRun | null>): PerfRun | null {
  const benches = runs.flatMap(run => run?.benches || [])
  return benches.length ? { benches } : null
}

// guard on benches: a perf run that failed writes `{}`, which must skip the section, not crash
const basePerf = mergePerfRuns(
  readJson(process.env.BASE_PERF),
  parseVitestBenchmarks(readJson(process.env.BASE_TRANSFORM_PERF)),
)
const prPerf = mergePerfRuns(
  readJson(process.env.PR_PERF),
  parseVitestBenchmarks(readJson(process.env.PR_TRANSFORM_PERF)),
)
if (prPerf?.benches?.length)
  sections.push(renderPerfReport(basePerf, prPerf))

const precompilePerf = readJson(process.env.PRECOMPILE_PERF)
if (precompilePerf?.off?.benches?.length && precompilePerf?.on?.benches?.length)
  sections.push(renderPrecompileReport(bundleData, precompilePerf))

let out = sections.join('\n\n---\n\n')

const baseline = process.env.BASE_LABEL
if (baseline)
  out += `\n\n<sub>Baseline: ${baseline} · gzipped is the headline size metric · perf is directional (shared-runner, gated)</sub>`

// eslint-disable-next-line no-console
console.log(out)
