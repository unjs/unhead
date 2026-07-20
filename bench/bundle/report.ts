import fs from 'node:fs'
import process from 'node:process'
import { collectBundleData, renderBundleReport } from './bundle-report'
import { renderPerfReport } from './perf-report'
import { renderPrecompileReport } from './precompile-report'

// Combined size + perf comment for the PR. Bundle data comes from the dist dirs
// (BASE_DIST for the base baseline); perf comes from JSON the workflow produced by
// running perf-ci.mjs on the base and PR builds (BASE_PERF / PR_PERF).
const bundleData = collectBundleData()
const sections: string[] = [renderBundleReport(bundleData.filter(item => !item.comparison))]

function readPerf(p?: string) {
  return p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
}

// guard on benches: a perf run that failed writes `{}`, which must skip the section, not crash
const prPerf = readPerf(process.env.PR_PERF)
if (prPerf?.benches?.length)
  sections.push(renderPerfReport(readPerf(process.env.BASE_PERF), prPerf))

const precompilePerf = readPerf(process.env.PRECOMPILE_PERF)
if (precompilePerf?.off?.benches?.length && precompilePerf?.on?.benches?.length)
  sections.push(renderPrecompileReport(bundleData, precompilePerf))

let out = sections.join('\n\n---\n\n')

const baseline = process.env.BASE_LABEL
if (baseline)
  out += `\n\n<sub>Baseline: ${baseline} · gzipped is the headline size metric · perf is directional (shared-runner, gated)</sub>`

// eslint-disable-next-line no-console
console.log(out)
