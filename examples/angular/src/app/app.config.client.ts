import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { appConfig } from './app.config';
import { provideClientHead } from '@unhead/angular'

const clientConfig: ApplicationConfig = {
  providers: [
    provideClientHead(),
  ]
};

export const config = mergeApplicationConfig(appConfig, clientConfig);
