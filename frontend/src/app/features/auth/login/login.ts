import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { CommonModule } from '@angular/common';
import { NeonButtonComponent } from '../../../shared/components/neon-button/neon-button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ ReactiveFormsModule, CommonModule, NeonButtonComponent ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject( AuthService );

  isLoading = signal( false );
  errorMsg = signal( '' );

  loginForm: FormGroup = this.fb.group({
    email: [ '', [ Validators.required, Validators.email ] ],
    password: ['', Validators.required]
  });

  onSubmit() {
    if ( this.loginForm.invalid ) return;

    this.isLoading.set( true );
    this.errorMsg.set( '' );

    const { email, password } = this.loginForm.value;

    this.authService.login( email, password ).subscribe( {
      next: () =>
      {
        this.isLoading.set( false );
        this.router.navigate( [ '/admin/' ] );
      },
      error: ( err ) =>
      {
        this.isLoading.set( false );
        this.errorMsg.set( err.error?.message || 'Error de autenticación' );
      }
    } );
  }
}
