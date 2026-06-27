import fs from 'node:fs'
import process from 'node:process'
import { collectBundleData, renderBundleReport } from './bundle-report'
import { renderPerfReport } from './perf-report'

// Combined size + perf comment for the PR. Bundle data comes from the dist dirs
// (BASE_DIST for the base baseline); perf comes from JSON the workflow produced by
// running perf-ci.mjs on the base and PR builds (BASE_PERF / PR_PERF).
const sections: string[] = [renderBundleReport(collectBundleData())]

function readPerf(p?: string) {
  return p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
}

const prPerf = readPerf(process.env.PR_PERF)
if (prPerf)
  sections.push(renderPerfReport(readPerf(process.env.BASE_PERF), prPerf))

let out = sections.join('\n\n---\n\n')

const baseline = process.env.BASE_LABEL
if (baseline)
  out += `\n\n<sub>Baseline: ${baseline} · gzipped is the headline size metric · perf is directional (shared-runner, gated)</sub>`

// eslint-disable-next-line no-console
console.log(out)
