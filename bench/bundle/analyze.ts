import { collectBundleData, renderBundleReport } from './bundle-report'

// eslint-disable-next-line no-console
console.log(renderBundleReport(collectBundleData().filter(item => !item.comparison)))
