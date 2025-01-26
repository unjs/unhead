import type { ComponentFixture } from '@angular/core/testing'
import { TestBed } from '@angular/core/testing'

import { Head } from './head.component'

describe('ngxUnheadComponent', () => {
  let component: Head
  let fixture: ComponentFixture<Head>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Head],
    })
      .compileComponents()

    fixture = TestBed.createComponent(Head)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
