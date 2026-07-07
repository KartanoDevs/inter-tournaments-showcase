import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { provideRouter } from '@angular/router';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ App, ToastModule ],
      providers: [ MessageService, provideRouter( [] ) ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  } );
});
