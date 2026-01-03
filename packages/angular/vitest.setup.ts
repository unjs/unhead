import { getTestBed } from '@angular/core/testing'
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing'
import 'zone.js'
import 'zone.js/testing'

// Reset TestBed if it's already been initialized
if ((globalThis as any).__karma__) {
  getTestBed().resetTestingModule()
}

// First, initialize the Angular testing environment
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true } },
)
