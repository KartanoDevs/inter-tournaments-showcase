import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../shared/services/player.service';
import { TeamService } from '../../shared/services/team.service';
import { Player } from '../../shared/models/player.model';
import { Team } from '../../shared/models/team.model';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';
import { PokeLoader } from '../../shared/components/poke-loader/poke-loader';
import { PlayerCard } from '../../shared/components/player-card/player-card';
import { PositionLabelPipe } from '../../shared/pipes/position-label.pipe';

@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [ CommonModule, PokeLoader, PlayerCard, PositionLabelPipe, MediaUrlPipe ],
  templateUrl: './roster.html',
  styleUrl: './roster.css'
})
export class Roster implements OnInit
{
  private playerService = inject( PlayerService );
  private teamService = inject( TeamService );

  activeTab = signal<'male' | 'female'>('male');
  isLoading = signal( true );
  players = signal<Player[]>( [] );
  teams = signal<Team[]>( [] );
  selectedPlayer = signal<Player | null>( null );
  showLoader = signal( false );

  filteredPlayers = computed( () =>
  {
    const keyword = this.activeTab() === 'male' ? 'masculino' : 'femenino';
    const teamIds = this.teams()
      .filter( t => t.name.toLowerCase().includes( keyword ) )
      .map( t => t.id );
    return this.players().filter( p => teamIds.includes( p.teamId ) );
  } );

  ngOnInit()
  {
    this.playerService.getPlayers().subscribe( {
      next: ( res: any ) =>
      {
        this.players.set( this.shuffle( res.data || [] ) );
        this.isLoading.set( false );
      },
      error: () => this.isLoading.set( false )
    } );

    this.teamService.getAllTeams().subscribe( {
      next: ( res: any ) => this.teams.set( res.data || [] )
    } );
  }

  setTab(tab: 'male' | 'female') {
    this.activeTab.set(tab);
  }

  openPlayer( player: Player )
  {
    this.selectedPlayer.set( player );
    if ( player.isPoke )
    {
      this.showLoader.set( true );
    }
  }

  onLoaderDone()
  {
    this.showLoader.set( false );
  }

  closePlayer()
  {
    this.selectedPlayer.set( null );
    this.showLoader.set( false );
  }


  /** Fisher-Yates: orden aleatorio diferente cada vez que se entra */
  private shuffle<T>( arr: T[] ): T[]
  {
    const a = [ ...arr ];
    for ( let i = a.length - 1; i > 0; i-- )
    {
      const j = Math.floor( Math.random() * ( i + 1 ) );
      [ a[ i ], a[ j ] ] = [ a[ j ], a[ i ] ];
    }
    return a;
  }
}

