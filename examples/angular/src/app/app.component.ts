import { Component, OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { useHead, useSeoMeta } from '@unhead/angular'
import {CounterComponent} from './counter/counter.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CounterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  public greeting = 'hello world';
  constructor(
  ) {
    useHead({
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        {
          charset: 'utf-8'
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1'
        }
      ],
      title: 'Hello from Angular 123',
      bodyAttrs: {
        class: 'foo',
        style: 'background-color: salmon'
      },
      style: [
        {
          textContent: 'body { background-color: pink; }',
          tagPosition: 'bodyOpen'
        }
      ],
      script: [
        {
          src: 'https://example.com/script.js',
          async: true,
          tagPosition: 'bodyClose',
        }
      ]
    })
    useSeoMeta({
      description: 'hello world'
    })
  }

  ngOnInit() {
    console.log('setting title')
  }
}
