import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Minimal application shell; each practice owns its state inside its routed feature. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
