// counter.component.ts
import { Component, signal } from '@angular/core';
import { Unhead } from '@unhead/angular'

@Component({
  selector: 'app-counter',
  templateUrl: './counter.component.html',
  styleUrls: ['./counter.component.css']
})
export class CounterComponent {
  counter = signal(0);

  constructor(private unhead: Unhead) {
    this.unhead.useHead({
      title: () => `Counter: ${this.counter()}`
    });
  }

  incrementCounter() {
    this.counter.update(value => value + 1);
    console.log('incrementing counter using setTitle ')
  }
}
