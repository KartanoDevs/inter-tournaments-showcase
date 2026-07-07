import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeonFileUploader } from './neon-file-uploader';

describe('NeonFileUploader', () => {
  let component: NeonFileUploader;
  let fixture: ComponentFixture<NeonFileUploader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NeonFileUploader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NeonFileUploader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
