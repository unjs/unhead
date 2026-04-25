#!/usr/bin/env node
import process from 'node:process'

import ('../dist/index.mjs').then(m => m.run()).catch((err) => {
  console.error(err)
  process.exit(1)
})
