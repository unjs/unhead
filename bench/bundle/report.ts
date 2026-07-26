import fs from 'node:fs'
import process from 'node:process'
import { collectBundleData, renderBundleReport } from './bundle-report'
import { renderDependencyReport } from './dependency-report'
import { renderPerfReport } from './perf-report'

// Combined bundle, dependency, and perf comment for the PR. Bundle data comes
// from the dist dirs; dependency and perf data come from JSON generated for the
// base and PR builds.
const sections: string[] = [renderBundleReport(collectBundleData())]

function readJson(p?: string) {
  return p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
}

const prDependencies = readJson(process.env.PR_DEPENDENCIES)
if (prDependencies?.packages?.length)
  sections.push(renderDependencyReport(readJson(process.env.BASE_DEPENDENCIES), prDependencies))

// guard on benches: a perf run that failed writes `{}`, which must skip the section, not crash
const prPerf = readJson(process.env.PR_PERF)
if (prPerf?.benches?.length)
  sections.push(renderPerfReport(readJson(process.env.BASE_PERF), prPerf))

let out = sections.join('\n\n---\n\n')

const baseline = process.env.BASE_LABEL
if (baseline)
  out += `\n\n<sub>Baseline: ${baseline} · gzipped is the headline size metric · perf is directional (shared-runner, gated)</sub>`

// eslint-disable-next-line no-console
console.log(out)
