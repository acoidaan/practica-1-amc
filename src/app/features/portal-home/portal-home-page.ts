import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Entry page for the collection of AMC practices. */
@Component({
  selector: 'app-portal-home-page',
  imports: [RouterLink],
  styleUrl: './portal-home-page.css',
  templateUrl: './portal-home-page.html',
})
export class PortalHomePage {}
