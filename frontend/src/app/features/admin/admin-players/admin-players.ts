import { Component, inject, OnInit, signal, computed, Input, Output, EventEmitter, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PositionLabelPipe, POSITION_LABELS_MALE } from '../../../shared/pipes/position-label.pipe';
import { MessageService } from 'primeng/api';
import { PlayerService } from '../../../shared/services/player.service';
import { TeamService } from '../../../shared/services/team.service';
import { Player, VolleyballPosition } from '../../../shared/models/player.model';
import { Team } from '../../../shared/models/team.model';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { DynamicFormComponent } from '../../../shared/components/dynamic-form/dynamic-form';
import { DynamicFieldConfig } from '../../../shared/components/dynamic-form/dynamic-form.models';
import { UnsavedChangesDialogComponent } from '../../../shared/components/unsaved-changes-dialog/unsaved-changes-dialog';
import { NeonPaginatorComponent } from '../../../shared/components/neon-paginator/neon-paginator';
import { DialogService } from '../../../shared/services/dialog.service';
import { Validators } from '@angular/forms';

@Component({
  selector: 'app-admin-players',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    ToastModule,
    ToggleSwitchModule,
    PositionLabelPipe,
    DynamicFormComponent,
    UnsavedChangesDialogComponent,
    NeonPaginatorComponent,
    MediaUrlPipe,
  ],
  templateUrl: './admin-players.html',
  styleUrl: './admin-players.css',
  providers: [MessageService]
})
export class AdminPlayers implements OnInit {
  private playerService = inject( PlayerService );
  private teamService = inject( TeamService );
  private dialogService = inject( DialogService );
  messageService = inject(MessageService);

  @Input() preSelectedTeamId: string | null = null;
  @Output() onSaveComplete = new EventEmitter<void>();

  // Referencia al ng-template del formulario de jugador
  @ViewChild( 'playerFormTemplate' ) playerFormTemplate!: TemplateRef<any>;

  players = signal<Player[]>([]);
  teamsList = signal<Team[]>([]);
  isLoading = signal(true);

  paginatorFirst = signal(0);
  paginatorRows = signal(10);
  pagedPlayers = computed(() =>
    this.players().slice(this.paginatorFirst(), this.paginatorFirst() + this.paginatorRows())
  );
  playerFormFields = signal<DynamicFieldConfig[]>( [] );

  unsavedDialogVisible = signal( false );

  // Form tracking
  isPlayerFormDirty = signal( false );

  currentPlayer: Partial<Player> = {};

  positions = Object.values( VolleyballPosition ).map( pos => ( {
    label: POSITION_LABELS_MALE[ pos ] ?? pos, // Etiqueta en castellano
    value: pos                                // Valor del enum para la API
  } ) );

  ngOnInit() {
    this.loadPlayers();
    this.loadTeams();
  }

  onPageChange(event: { first: number; rows: number }) {
    this.paginatorFirst.set(event.first);
    this.paginatorRows.set(event.rows);
  }

  loadPlayers() {
    this.isLoading.set( true );
    const fetchObs = this.preSelectedTeamId
      ? this.playerService.getPlayers( this.preSelectedTeamId )
      : this.playerService.getPlayers();

    fetchObs.subscribe({
      next: (res: any) => {
        this.players.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los jugadores' });
        this.isLoading.set(false);
      }
    });
  }

  loadTeams() {
    this.teamService.getAllTeams().subscribe({
      next: ( res: any ) =>
      {
        this.teamsList.set( res.data );
        this.updateFormFields();
      }
    });
  }

  updateFormFields( thumbnailUrl?: string, imageUrl?: string )
  {
    this.playerFormFields.set( [
      { name: 'firstName', label: 'Nombre', type: 'text', validators: [ Validators.required ], required: true },
      { name: 'lastName', label: 'Apellidos', type: 'text', validators: [ Validators.required ], required: true },
      { name: 'nickname', label: 'Apodo (Opcional)', type: 'text' },
      {
        name: 'teamId',
        label: 'Equipo',
        type: 'select',
        options: this.teamsList().map( t => ( { label: t.name, value: t.id } ) ),
        validators: [ Validators.required ],
        required: true
      },
      { name: 'number', label: 'Dorsal', type: 'number', validators: [ Validators.required, Validators.min( 1 ), Validators.max( 99 ) ], required: true },
      { name: 'position', label: 'Posición', type: 'select', options: this.positions, validators: [ Validators.required ], required: true },
      { name: 'isPoke', label: 'Activar Poke Effect', type: 'toggle' },
      { name: 'image', label: 'Foto Principal', type: 'file', fileConfig: { previewHeight: 250 }, initialImageUrl: imageUrl }
    ] );
  }

  getTeamName( teamId: string | undefined ): string
  {
    if ( !teamId ) return 'Sin Equipo';
    const team = this.teamsList().find( t => t.id === teamId );
    return team?.name ?? teamId;
  }

  getTeamGender( teamId: string | undefined ): 'MALE' | 'FEMALE'
  {
    if ( !teamId ) return 'MALE';
    const team = this.teamsList().find( t => t.id === teamId );
    return team?.competitionType ?? 'MALE';
  }

  openNew() {
    this.currentPlayer = {
      position: VolleyballPosition.UNASSIGNED,
      teamId: this.preSelectedTeamId || ''
    };
    this.updateFormFields(); // Sin URLs de imagen (nuevo jugador)
    this.isPlayerFormDirty.set( false );
    this.dialogService.open( this.playerFormTemplate, {
      title: 'NUEVO JUGADOR',
      closeOnBackdrop: false
    } );
  }

  editPlayer(player: Player) {
    this.currentPlayer = { ...player };
    // Precarga las URLs de imagen actuales del jugador en los fields de FilePond
    this.updateFormFields(
      ( player as any ).thumbnailUrl || undefined,
      ( player as any ).imageUrl || undefined
    );
    this.isPlayerFormDirty.set( false );
    this.dialogService.open( this.playerFormTemplate, {
      title: 'EDITAR JUGADOR',
      closeOnBackdrop: false
    } );
  }

  onDialogHide( event: void )
  {
    this.isPlayerFormDirty.set( false );
  }

  closePlayerDialog()
  {
    if ( this.isPlayerFormDirty() )
    {
      this.unsavedDialogVisible.set( true );
    } else
    {
      this.dialogService.close();
    }
  }

  onUnsavedConfirm( shouldDiscard: boolean )
  {
    this.unsavedDialogVisible.set( false );
    if ( shouldDiscard )
    {
      this.dialogService.close();
      this.isPlayerFormDirty.set( false );
    }
  }

  onPlayerFormDirty( isDirty: boolean )
  {
    this.isPlayerFormDirty.set( isDirty );
  }

  onPlayerFormSubmit( payload: { values: any, files: Record<string, File> } )
  {
    const { values, files } = payload;
    const formData = new FormData();

    formData.append( 'firstName', values.firstName );
    formData.append( 'lastName', values.lastName );
    if ( values.nickname ) formData.append( 'nickname', values.nickname );
    if ( values.number !== null && values.number !== undefined ) formData.append( 'number', values.number.toString() );
    if ( values.position ) formData.append( 'position', values.position );
    if ( values.heightCm !== null && values.heightCm !== undefined ) formData.append( 'heightCm', values.heightCm.toString() );
    formData.append( 'teamId', values.teamId );
    formData.append( 'isPoke', String( values.isPoke ?? false ) );

    if ( files[ 'image' ] ) formData.append( 'image', files[ 'image' ] );
    if ( files[ 'thumbnail' ] ) formData.append( 'thumbnail', files[ 'thumbnail' ] );

    if ( this.currentPlayer.id )
    {
      this.playerService.updatePlayer( this.currentPlayer.id, formData ).subscribe( {
        next: () =>
        {
          this.messageService.add( { severity: 'success', summary: 'Éxito', detail: 'Jugador actualizado' } );
          this.dialogService.close();
          this.loadPlayers();
          this.onSaveComplete.emit();
        },
        error: ( err: any ) => this.messageService.add( { severity: 'error', summary: 'Error', detail: err.error?.message } )
      } );
    } else
    {
      this.playerService.createPlayer( formData ).subscribe( {
        next: () =>
        {
          this.messageService.add( { severity: 'success', summary: 'Éxito', detail: 'Jugador creado' } );
          this.dialogService.close();
          this.loadPlayers();
          this.onSaveComplete.emit();
        },
        error: ( err: any ) => this.messageService.add( { severity: 'error', summary: 'Error', detail: err.error?.message } )
      } );
    }
  }
}
