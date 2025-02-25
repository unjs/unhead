import type { ComponentFixture } from '@angular/core/testing'
import { TestBed } from '@angular/core/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as composables from '../unhead/composables'
import { Head } from './head.component'

describe('headComponent', () => {
  let component: Head
  let fixture: ComponentFixture<Head>
  let mockHeadEntry: any

  beforeEach(() => {
    mockHeadEntry = {
      patch: vi.fn(),
      dispose: vi.fn(),
    }
    vi.spyOn(composables, 'useHead').mockReturnValue(mockHeadEntry)
  })

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Head],
    }).compileComponents()

    fixture = TestBed.createComponent(Head)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should initialize with empty head entry', () => {
    expect(composables.useHead).toHaveBeenCalledWith({})
  })

  describe('updateHead', () => {
    it('should call patch with transformed nodes', () => {
      const mockNodes = [
        {
          type: 'title',
          props: {},
          children: ['Test Title'],
        },
        {
          type: 'meta',
          props: { name: 'description', content: 'Test Description' },
        },
      ]

      component.updateHead(mockNodes)

      const patchArg = mockHeadEntry.patch.mock.calls[0][0]
      expect(patchArg).toHaveProperty('title', 'Test Title')
      expect(patchArg).toHaveProperty('meta')
      expect(patchArg.meta[0]).toEqual({
        name: 'description',
        content: 'Test Description',
      })
    })

    it('should transform complex nodes correctly', () => {
      const mockNodes = [
        {
          type: Symbol('Fragment'),
          children: [
            {
              type: 'title',
              props: {},
              children: ['Nested Title'],
            },
            {
              type: 'meta',
              props: {
                name: 'description',
                content: 'Nested Description',
              },
            },
          ],
        },
      ] as NodeProps[]

      component.updateHead(mockNodes)

      const patchArg = mockHeadEntry.patch.mock.calls[0][0]
      expect(patchArg.title).toBe('Nested Title')
      expect(patchArg.meta[0]).toEqual({
        name: 'description',
        content: 'Nested Description',
      })
    })
  })

  describe('ngOnDestroy', () => {
    it('should dispose the head entry', () => {
      component.ngOnDestroy()
      expect(mockHeadEntry.dispose).toHaveBeenCalled()
    })
  })
})
