import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrowdEntries } from './crowd-entries';

describe('CrowdEntries', () => {
  let component: CrowdEntries;
  let fixture: ComponentFixture<CrowdEntries>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrowdEntries]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrowdEntries);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
