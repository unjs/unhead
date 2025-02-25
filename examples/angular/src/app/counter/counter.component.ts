// counter.component.ts
import {Component, signal} from '@angular/core';
import { useHead } from '@unhead/angular'

@Component({
  selector: 'app-counter',
  templateUrl: './counter.component.html',
  styleUrls: ['./counter.component.css']
})
export class CounterComponent {
  counter = signal(0);
  head = useHead()

  constructor() {
  }

  incrementCounter() {
    this.head.patch({
      title: () => `Counter: ${this.counter()}`
    })
    this.counter.update(value => value + 1);
    console.log('incrementing counter using setTitle ')
  }
}
