import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth-management/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule, NgxSpinnerModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  loginForm: FormGroup;
  hidePassword: boolean = true;
  submitted: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
        ],
      ],
    });

  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }


  onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.valid) {
        this.spinner.show();
      const email = this.loginForm.value.email;
      const password = this.loginForm.value.password;
      const payload = {
        email: email,
        password: password
      };

      this.authService.login(payload).subscribe({
        next: (response: any) => {
          if (response) {
            localStorage.setItem('access_token', response.token);
            this.router.navigate(['/overview']);
          }
          this.toastr.success('Login Sucessful');
          this.spinner.hide();
        },
        error: (error: any) => {
          console.log("error", error.error?.errorMessage)
          this.toastr.error(error.error?.errorMessage || 'Login failed');
           this.spinner.hide();
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
      
      return;
    }
  }
}
