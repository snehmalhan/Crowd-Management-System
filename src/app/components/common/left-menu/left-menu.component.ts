import { CommonModule } from '@angular/common';
import { Component, OnInit, Renderer2 } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../services/auth-management/auth.service';

@Component({
  selector: 'app-left-menu',
  templateUrl: './left-menu.component.html',
  styleUrls: ['./left-menu.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule],
})
export class LeftMenuComponent implements OnInit {
  navItems: any[] = [];
  menuClose: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private renderer: Renderer2
  ) {
    this.navItems = this.getNavigationRoutes(routes);
  }

  ngOnInit() {
    const savedMenuState = localStorage.getItem('menuClose');
    if (savedMenuState !== null) {
      this.menuClose = savedMenuState === 'true';

      if (this.menuClose) {
        this.renderer.addClass(document.body, 'sidebar-closed');
      }
    }
  }

  getNavigationRoutes(routesArr: any[]): any[] {
    const navItems: any[] = [];
    routesArr.forEach(route => {
      if (route.data && route.data.nav) {
        navItems.push({
          path: '/' + route.path,
          title: route.data.title,
          icon: route.data.icon
        });
      }
      if (route.children) {
        route.children.forEach((child: any) => {
          if (child.data && child.data.nav) {
            navItems.push({
              path: '/' + (route.path ? route.path + '/' : '') + child.path,
              title: child.data.title,
              icon: child.data.icon
            });
          }
        });
      }
    });
    return navItems;
  }

  logout() {
    this.authService.loggedout();
  }

  leftMenuClose() {
    this.menuClose = !this.menuClose;
    localStorage.setItem('menuClose', this.menuClose.toString());
    if (this.menuClose) {
      this.renderer.addClass(document.body, 'sidebar-closed');
    } else {
      this.renderer.removeClass(document.body, 'sidebar-closed');
    }
  }
}
