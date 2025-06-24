import {mergeApplicationConfig, ApplicationConfig} from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { provideServerHead } from '@unhead/angular/server'

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideServerHead({
      init: [
        {
          htmlAttrs: {
            lang: 'en-AU',
            ['data-foo']: true,
            style: {
              'font-size': '16px'
            }
          },
        }
      ]
    }),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
