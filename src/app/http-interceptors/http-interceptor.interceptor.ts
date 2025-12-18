import { Inject, Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class HttpInterceptorInterceptor implements HttpInterceptor {
  sessionId: any = null;

  constructor(
    private router: Router,
    public spinner: NgxSpinnerService,
    private toastr: ToastrService
  ) {
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('access_token');
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request).pipe(
      tap(
        (event) => {
          if (event instanceof HttpResponse) {
            if (request.url.includes('/auth/login')) {
            }
            return Promise.resolve(event);
          }
          return event;
        },
        async (error) => {
          if (error.status == 0) {
            this.logout();
            return Promise.reject(error);
          }
          else if (error.status == 404) {
            this.toastr.error('Server down or endpoint not found', error);
            return Promise.resolve(error);
          }
          else if (error.status === 401) {
            if (request.url.includes('/auth/login')) {
              return Promise.resolve(error);
            }
            this.toastr.error(error.error?.errorMessage || "An unexpected error occurred");
            sessionStorage.clear();
            localStorage.clear();
            this.router.navigate(['/login']).then(() => {
              window.location.reload();
            });
            this.spinner.hide();
            return Promise.resolve(error);
          }
          else if (error.status === 403) {
            alert('Token Expired. Logging in again');
            this.logout();
            return Promise.resolve(error);
          }
          else if (error.status === 409) {
            alert(error.error.message);
            sessionStorage.clear();
            localStorage.clear();
            this.router.navigate(['/login']).then(() => {
              window.location.reload();
            });
            this.spinner.hide();
            return Promise.resolve(error);
          }
          else {
            if (error.status === 400) {
              this.spinner.hide();
              return Promise.resolve(error);
            }
            this.spinner.hide();
            return Promise.resolve(error);
          }
        }
      )
    );
  }

  async logout() {
    sessionStorage.clear();
    localStorage.clear();
    this.router.navigate(['/login']).then(() => {
      window.location.reload();
    });
  }

}