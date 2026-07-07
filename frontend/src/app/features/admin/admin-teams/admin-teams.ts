import { Component, inject, OnInit, signal, computed, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TeamService } from '../../../shared/services/team.service';
import { Team } from '../../../shared/models/team.model';
import { AdminPlayers } from '../admin-players/admin-players';
import { DynamicFormComponent } from '../../../shared/components/dynamic-form/dynamic-form';
import { DynamicFieldConfig } from '../../../shared/components/dynamic-form/dynamic-form.models';
import { UnsavedChangesDialogComponent } from '../../../shared/components/unsaved-changes-dialog/unsaved-changes-dialog';
import { NeonPaginatorComponent } from '../../../shared/components/neon-paginator/neon-paginator';
import { DialogService } from '../../../shared/services/dialog.service';
import { Validators } from '@angular/forms';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-admin-teams',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    DynamicFormComponent,
    UnsavedChangesDialogComponent,
    TooltipModule,
    ToastModule,
    AdminPlayers,
    NeonPaginatorComponent,
    MediaUrlPipe,
  ],
  templateUrl: './admin-teams.html',
  styleUrl: './admin-teams.css',
  providers: [ MessageService ]
})
export class AdminTeams implements OnInit {
  private teamService = inject( TeamService );
  private dialogService = inject( DialogService );
  messageService = inject(MessageService);

  // Referencias a los ng-template del HTML
  @ViewChild( 'teamFormTemplate' ) teamFormTemplate!: TemplateRef<any>;
  @ViewChild( 'playerQuickAddTemplate' ) playerQuickAddTemplate!: TemplateRef<any>;

  teams = signal<Team[]>([]);
  isLoading = signal(true);

  paginatorFirst = signal(0);
  paginatorRows = signal(10);
  pagedTeams = computed(() =>
    this.teams().slice(this.paginatorFirst(), this.paginatorFirst() + this.paginatorRows())
  );

  // Dialog states
  unsavedDialogVisible = signal( false );

  // Form tracking
  isTeamFormDirty = signal( false );

  // Current editing state
  currentTeam: Partial<Team> = {};
  selectedTeamIdForPlayer = signal<string | null>(null);

  teamFormFields: DynamicFieldConfig[] = [];

  /** Reconstruye el array de fields con la URL de imagen actual del equipo (si existe) */
  private buildTeamFormFields( logoUrl?: string ): void
  {
    this.teamFormFields = [
      { name: 'name', label: 'Nombre Completo', type: 'text', validators: [ Validators.required ], required: true },
      { name: 'shortName', label: 'Acrónimo (Máx 10)', type: 'text', validators: [ Validators.required, Validators.maxLength( 10 ) ], required: true },
      { name: 'logo', label: 'Logo del Equipo', type: 'file', fileConfig: { previewHeight: 120 }, initialImageUrl: logoUrl || undefined },
      { name: 'competitionType', label: 'Tipo de Competición', type: 'select', options: [ { label: 'Masculina', value: 'MALE' }, { label: 'Femenina', value: 'FEMALE' } ], required: false }
    ];
  }

  onPageChange(event: { first: number; rows: number }) {
    this.paginatorFirst.set(event.first);
    this.paginatorRows.set(event.rows);
  }

  ngOnInit() {
    this.buildTeamFormFields();
    this.loadTeams();
  }

  loadTeams() {
    this.isLoading.set(true);
    this.teamService.getAllTeams().subscribe({
      next: (res: any) => {
        this.teams.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los equipos' });
        this.isLoading.set(false);
      }
    });
  }

  openNew() {
    this.currentTeam = {};
    this.buildTeamFormFields(); // Sin URL de logo (nuevo equipo)
    this.isTeamFormDirty.set( false );
    this.dialogService.open( this.teamFormTemplate, {
      title: 'NUEVO EQUIPO',
      closeOnBackdrop: false
    } );
  }

  editTeam(team: Team) {
    this.currentTeam = { ...team };
    // Pasa la URL del logo actual al field para que FilePond lo precargue
    this.buildTeamFormFields( team.logo ? team.logo : undefined );
    this.isTeamFormDirty.set( false );
    this.dialogService.open( this.teamFormTemplate, {
      title: 'EDITAR EQUIPO',
      closeOnBackdrop: false
    } );
  }

  onDialogHide( event: void )
  {
    this.isTeamFormDirty.set( false );
  }

  closeTeamDialog()
  {
    if ( this.isTeamFormDirty() )
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
      this.isTeamFormDirty.set( false );
    }
  }

  onTeamFormDirty( isDirty: boolean )
  {
    this.isTeamFormDirty.set( isDirty );
  }

  onTeamFormSubmit( payload: { values: any, files: Record<string, File> } )
  {
    const { values, files } = payload;
    const formData = new FormData();

    formData.append( 'name', values.name );
    formData.append( 'shortName', values.shortName );
    if ( values.competitionType ) formData.append( 'competitionType', values.competitionType );

    if ( files[ 'logo' ] )
    {
      formData.append( 'logo', files[ 'logo' ] );
    }

    if ( this.currentTeam.id )
    {
      this.teamService.updateTeam( this.currentTeam.id, formData ).subscribe( {
        next: () =>
        {
          this.messageService.add( { severity: 'success', summary: 'Éxito', detail: 'Equipo actualizado' } );
          this.dialogService.close();
          this.loadTeams();
        },
        error: ( err: any ) =>
        {
          this.messageService.add( { severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al actualizar' } );
        }
      } );
    } else
    {
      this.teamService.createTeam( formData ).subscribe( {
        next: () =>
        {
          this.messageService.add( { severity: 'success', summary: 'Éxito', detail: 'Equipo creado' } );
          this.dialogService.close();
          this.loadTeams();
        },
        error: ( err: any ) =>
        {
          this.messageService.add( { severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al crear' } );
        }
      } );
    }
  }

  openAddPlayer(team: Team) {
    this.selectedTeamIdForPlayer.set(team.id);
    this.dialogService.open( this.playerQuickAddTemplate, {
      title: 'AÑADIR JUGADOR',
    } );
  }

  onPlayerAdded() {
    this.dialogService.close();
    this.loadTeams();
  }
}
