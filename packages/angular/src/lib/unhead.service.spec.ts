import { TestBed } from '@angular/core/testing'

import { Unhead } from './unhead.service'

describe('ngxUnheadService', () => {
  let service: Unhead

  beforeEach(() => {
    TestBed.configureTestingModule({})
    service = TestBed.inject(Unhead)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})
