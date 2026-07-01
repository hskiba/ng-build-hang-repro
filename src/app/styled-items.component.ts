import { Component } from '@angular/core';

@Component({
  selector: 'app-styled-a',
  template: `<ng-content />`,
  styles: `:host { display: block; }`,
})
export class StyledAComponent {}

@Component({
  selector: 'app-styled-b',
  template: `<ng-content />`,
  styles: `:host { display: block; }`,
})
export class StyledBComponent {}
