import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpManagerService } from '../../http-manager/http-manager.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private isLoggedIn = new BehaviorSubject<boolean>(false);
  private accessToken: string | null = null;
  private role: string = '';

  constructor(
    private http: HttpClient,
    private httpManager: HttpManagerService,
    private route: Router,
  ) {
    const token = localStorage.getItem('token');
    this.isLoggedIn.next(!!token);
  }

  setRole(role: string) {
    this.role = role;
    localStorage.setItem('user_role_name', role);
  }

  getRole(): string {
    return this.role || localStorage.getItem('user_role_name') || '';
  }

  hasRole(roles: string[]): boolean {
    return roles.includes(this.getRole());
  }

  login(payload: any) {
    return this.httpManager.post(
      'https://hiring-dev.internal.kloudspot.com/api/auth/login',
      payload
    ).pipe(tap(res => {
      localStorage.setItem('token', res.token);
      if (res.data) {
        localStorage.setItem('user', JSON.stringify(res.data));
      }
      this.isLoggedIn.next(true);
    }));
  }

  loggedout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn.next(false);
    this.route.navigate(['/login']);
  }


  isAuthenticated() {
    return this.isLoggedIn.asObservable();
  }
}
