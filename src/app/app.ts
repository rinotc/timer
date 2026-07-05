import { Component } from '@angular/core';
import { TabataTimer } from './tabata/tabata-timer';

@Component({
  selector: 'app-root',
  imports: [TabataTimer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
