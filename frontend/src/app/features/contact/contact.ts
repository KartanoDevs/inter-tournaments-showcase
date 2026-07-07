import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SponsorService } from './services/sponsor.service';
import { Sponsor } from './services/sponsor.model';
import { SponsorCardComponent } from '../../shared/components/sponsor-card/sponsor-card.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ CommonModule, SponsorCardComponent ],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact implements OnInit
{
  private sponsorService = inject( SponsorService );

  // Usamos signals para un rendimiento superior
  sponsors = signal<Sponsor[]>( [] );

  ngOnInit()
  {
    this.sponsorService.getSponsors().subscribe( {
      next: ( data ) => this.sponsors.set( data ),
      error: ( err ) => console.error( '[VONGOLA ERROR] Error al obtener sponsors:', err )
    } );
  }
}
