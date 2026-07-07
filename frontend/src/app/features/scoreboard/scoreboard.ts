import { Component, signal, effect, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NeonButtonComponent } from '../../shared/components/neon-button/neon-button.component';
import { NeonConfirmPopupComponent } from '../../shared/components/neon-confirm-popup/neon-confirm-popup.component';
import { SymbolMatrixComponent } from '../../shared/components/symbol-matrix/symbol-matrix.component';
import { RotateDevice } from '../../shared/components/rotate-device/rotate-device';
import { environment } from '../../../environments/environment';
import { TournamentService } from '../../shared/services/tournament.service';
import { Tournament4v4Team } from '../../shared/models/tournament.model';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [ RouterModule, NeonButtonComponent, NeonConfirmPopupComponent, SymbolMatrixComponent, RotateDevice ],
  templateUrl: './scoreboard.html',
  styleUrl: './scoreboard.css'
})
export class Scoreboard implements OnInit
{
  private readonly STORAGE_KEY = 'inter_voley_scoreboard_state';
  private tournamentService = inject(TournamentService);

  /** Equipos del torneo activo (vacío si no hay torneo activo) */
  tournamentTeams = signal<Tournament4v4Team[]>([]);

  /** Indicates whether the app is locked to scoreboard-only mode */
  readonly isScoreboardOnly = environment.scoreboardOnly;

  // --- Símbolos decorativos (voleibol) ---
  matrixSymbols = [ '排', '球', '部', '練', '飛', '打', '受', '繋', '努', '力', '汗', '絆', '闘', ];

  // --- Puntuación ---
  localScore = signal(0);
  awayScore = signal(0);

  // --- Sets ---
  localSets = signal(0);
  awaySets = signal(0);

  // --- Nombres de equipo ---
  localName = signal( 'LOCAL' );
  awayName = signal( 'VISITA' );

  // --- Configuración: puntos para ganar un set ---
  maxPoints = signal( 21 );

  // --- Configuración: sets para ganar el partido ---
  maxSets = signal( 1 );

  // --- Feedback visual ---
  localPulse = signal(false);
  awayPulse = signal(false);

  // --- UI: diálogos ---
  showResetDialog = signal( false );
  editingLocalName = signal( false );
  editingAwayName = signal( false );
  editingMaxPoints = signal( false );
  editingMaxSets = signal( false );

  // --- UI: popup set ganado ---
  showSetWonPopup = signal( false );
  setWinnerName = signal( '' );

  // --- UI: popup partido ganado ---
  showMatchWonPopup = signal( false );
  matchWinnerName = signal( '' );

  constructor () 
  {
    // Persistencia reactiva: cualquier cambio de estado se vuelca a localStorage
    effect( () =>
    {
      const state = {
        localScore: this.localScore(),
        awayScore: this.awayScore(),
        localSets: this.localSets(),
        awaySets: this.awaySets(),
        localName: this.localName(),
        awayName: this.awayName(),
        maxPoints: this.maxPoints(),
        maxSets: this.maxSets()
      };
      localStorage.setItem( this.STORAGE_KEY, JSON.stringify( state ) );
    } );
  }

  ngOnInit()
  {
    this.loadState();
    this.loadActiveTournamentTeams();
  }

  private loadActiveTournamentTeams()
  {
    this.tournamentService.getAll().subscribe({
      next: (res) => {
        const active = res.data.find(t => t.isActive && !t.isDeleted);
        this.tournamentTeams.set(active?.teams ?? []);
      },
      error: () => this.tournamentTeams.set([])
    });
  }

  private loadState()
  {
    const saved = localStorage.getItem( this.STORAGE_KEY );
    if ( saved )
    {
      try
      {
        const s = JSON.parse( saved );
        this.localScore.set( s.localScore ?? 0 );
        this.awayScore.set( s.awayScore ?? 0 );
        this.localSets.set( s.localSets ?? 0 );
        this.awaySets.set( s.awaySets ?? 0 );
        this.localName.set( s.localName ?? 'LOCAL' );
        this.awayName.set( s.awayName ?? 'VISITA' );
        this.maxPoints.set( s.maxPoints ?? 21 );
        this.maxSets.set( s.maxSets ?? 1 );
      } catch ( e )
      {
        console.error( 'Error al cargar el estado del marcador desde localStorage', e );
      }
    }
  }

  // --- Puntuación ---
  updateScore(team: 'local' | 'away', change: number) {
    if (team === 'local') {
      const next = this.localScore() + change;
      if ( next >= 0 && next <= this.maxPoints() * 2 )
      {
        this.localScore.set( next );
        if ( change > 0 ) { this.triggerPulse( 'local' ); this.checkSetWon(); }
      }
    } else
    {
      const next = this.awayScore() + change;
      if ( next >= 0 && next <= this.maxPoints() * 2 )
      {
        this.awayScore.set( next );
        if ( change > 0 ) { this.triggerPulse( 'away' ); this.checkSetWon(); }
      }
    }
  }

  /** Comprueba si un equipo ha alcanzado la condición de set ganado (>=maxPoints y diferencia >=2) */
  private checkSetWon()
  {
    // Si ya hay popups o el partido ya terminó, ignoramos
    if ( this.showSetWonPopup() || this.showMatchWonPopup() ) return;
    if ( this.localSets() >= this.maxSets() || this.awaySets() >= this.maxSets() ) return;

    const local = this.localScore();
    const away = this.awayScore();
    const target = this.maxPoints();

    let winner: 'local' | 'away' | null = null;
    if ( local >= target && ( local - away ) >= 2 )
    {
      winner = 'local';
    } else if ( away >= target && ( away - local ) >= 2 )
    {
      winner = 'away';
    }

    if ( winner )
    {
      const winnerName = winner === 'local' ? this.localName() : this.awayName();
      this.setWinnerName.set( winnerName );

      const currentSets = winner === 'local' ? this.localSets() : this.awaySets();

      // Si con este set ganan el partido:
      if ( currentSets + 1 >= this.maxSets() )
      {
        // Se adjudica el set automáticamente para que el marcador final lo refleje
        if ( winner === 'local' ) this.localSets.update( s => Math.min( 9, s + 1 ) );
        else this.awaySets.update( s => Math.min( 9, s + 1 ) );

        // Campeón final. Se muestra informativo y no se borran los puntos del último set.
        this.matchWinnerName.set( winnerName );
        this.showMatchWonPopup.set( true );
      } else
      {
        // Set regular: preguntamos si desean pasarlo al contador y reiniciar puntos
        this.showSetWonPopup.set( true );
      }
    }
  }

  /** Inicia el siguiente set: suma set al ganador (set regular) y resetea puntos a 0 */
  startNextSet()
  {
    const isLocal = this.setWinnerName() === this.localName();
    if ( isLocal )
    {
      this.localSets.update( s => Math.min( 9, s + 1 ) );
    } else {
      this.awaySets.update( s => Math.min( 9, s + 1 ) );
    }

    // Reseteo limpio para el inicio del nuevo set
    this.localScore.set( 0 );
    this.awayScore.set( 0 );
    this.showSetWonPopup.set( false );
  }

  dismissMatchWon() { this.showMatchWonPopup.set( false ); }

  /** Cierra el popup sin cambiar nada (el árbitro decide manualmente) */
  dismissSetWon()
  {
    this.showSetWonPopup.set( false );
  }

  triggerPulse(team: 'local' | 'away') {
    if (team === 'local') {
      this.localPulse.set(true);
      setTimeout(() => this.localPulse.set(false), 300);
    } else {
      this.awayPulse.set(true);
      setTimeout(() => this.awayPulse.set(false), 300);
    }
  }

  updateSets(team: 'local' | 'away', amount: number) {
    if (team === 'local') {
      this.localSets.update( s => Math.max( 0, Math.min( this.maxSets(), s + amount ) ) );
    } else {
      this.awaySets.update( s => Math.max( 0, Math.min( this.maxSets(), s + amount ) ) );
    }
  }

  switchSides() {
    const tName = this.localName(); this.localName.set( this.awayName() ); this.awayName.set( tName );
    const tScore = this.localScore(); this.localScore.set( this.awayScore() ); this.awayScore.set( tScore );
    const tSets = this.localSets(); this.localSets.set( this.awaySets() ); this.awaySets.set( tSets );
  }

  // --- Reinicio ---
  requestReset() { this.showResetDialog.set( true ); }
  cancelReset() { this.showResetDialog.set( false ); }

  confirmReset()
  {
    this.localName.set( 'LOCAL' ); this.awayName.set( 'VISITA' );
    this.applyReset();
  }

  /** Reinicia puntos, sets y config, pero mantiene los nombres de ambos equipos */
  confirmResetKeepNames()
  {
    this.applyReset();
  }

  private applyReset()
  {
    this.localScore.set( 0 ); this.awayScore.set( 0 );
    this.localSets.set( 0 ); this.awaySets.set( 0 );
    this.maxPoints.set( 25 ); this.maxSets.set( 3 );
    this.showResetDialog.set( false );
    this.showSetWonPopup.set( false );
    this.showMatchWonPopup.set( false );
  }

  // --- Edición inline de nombres ---
  startEditingName( team: 'local' | 'away' )
  {
    team === 'local' ? this.editingLocalName.set( true ) : this.editingAwayName.set( true );
  }

  onNameInput( team: 'local' | 'away', event: Event )
  {
    const value = ( event.target as HTMLInputElement ).value;
    team === 'local' ? this.localName.set( value ) : this.awayName.set( value );
  }

  finishEditingName( team: 'local' | 'away' )
  {
    if ( team === 'local' )
    {
      this.localName.set( this.localName().trim().toUpperCase() || 'LOCAL' );
      this.editingLocalName.set( false );
    } else
    {
      this.awayName.set( this.awayName().trim().toUpperCase() || 'VISITA' );
      this.editingAwayName.set( false );
    }
  }

  // --- Edición inline de maxPoints ---
  startEditingMaxPoints() { this.editingMaxPoints.set( true ); }

  finishEditingMaxPoints( valueStr?: string )
  {
    if ( valueStr != null )
    {
      const val = parseInt( valueStr, 10 );
      if ( !isNaN( val ) && val > 0 && val <= 99 ) this.maxPoints.set( val );
    }
    if ( this.maxPoints() < 1 ) this.maxPoints.set( 25 );
    this.editingMaxPoints.set( false );
  }

  // --- Edición inline de maxSets ---
  startEditingMaxSets() { this.editingMaxSets.set( true ); }

  finishEditingMaxSets( valueStr?: string )
  {
    if ( valueStr != null )
    {
      const val = parseInt( valueStr, 10 );
      if ( !isNaN( val ) && val > 0 && val <= 99 ) this.maxSets.set( val );
    }
    if ( this.maxSets() < 1 ) this.maxSets.set( 3 );
    this.editingMaxSets.set( false );
  }
}
