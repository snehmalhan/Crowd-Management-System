import { Component } from '@angular/core';
import { LeftMenuComponent } from "../left-menu/left-menu.component";
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from "../header/header.component";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-default-layout',
  standalone:true,
  imports: [LeftMenuComponent, RouterOutlet,CommonModule,HeaderComponent],
  templateUrl: './default-layout.component.html',
  styleUrl: './default-layout.component.scss'
})
export class DefaultLayoutComponent {

}
