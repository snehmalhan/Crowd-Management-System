// Imports
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};

@Injectable({
  providedIn: 'root',
})
export class HttpManagerService {
  constructor(private http: HttpClient) { }

  get(url: string): Observable<any> {
    return this.http.get(url);
  }

  post(url: string, body: Object, customHeader?: any): Observable<any> {
    return this.http.post(url, body, customHeader ? customHeader : undefined);
  }

  put(url: string, body: Object): Observable<any> {
    return this.http.put(url, body);
  }
  patch(url: string, body: Object): Observable<any> {
    return this.http.patch(url, body);
  }

  delete(url: string): Observable<any> {
    return this.http.delete(url);
  }
}
