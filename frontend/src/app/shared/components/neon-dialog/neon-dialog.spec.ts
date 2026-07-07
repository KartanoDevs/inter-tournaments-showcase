import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeonDialog } from './neon-dialog';

describe('NeonDialog', () => {
  let component: NeonDialog;
  let fixture: ComponentFixture<NeonDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NeonDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NeonDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
