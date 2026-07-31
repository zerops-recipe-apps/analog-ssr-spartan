import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: `
    :host {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 1.5rem;
      display: block;
    }
  `,
})
export class App {}
