import { Dropbox } from 'dropbox';

export interface DropboxUploaderOptions {
  appKey: string;
  appSecret: string;
  refreshToken: string;
  baseFolder: string; // p.ej. "/Backups Torneo Inter AUU"
}

export class DropboxUploader {
  private dbx: Dropbox;
  private baseFolder: string;

  constructor(opts: DropboxUploaderOptions) {
    this.dbx = new Dropbox({
      clientId: opts.appKey,
      clientSecret: opts.appSecret,
      refreshToken: opts.refreshToken,
    });
    // Normaliza: sin barra final; el SDK exige que la ruta empiece por "/".
    this.baseFolder = ('/' + opts.baseFolder.replace(/^\/+|\/+$/g, ''));
  }

  async uploadSnapshot(
    tournamentId: string,
    snapshotFilename: string,
    jsonBuffer: Buffer,
    xlsxBuffer: Buffer
  ): Promise<void> {
    const dir = `${this.baseFolder}/${tournamentId}`;
    const xlsxName = snapshotFilename.replace(/\.json$/, '.xlsx');

    // filesUpload crea las carpetas intermedias automáticamente.
    await Promise.all([
      this.upload(`${dir}/${snapshotFilename}`, jsonBuffer),
      this.upload(`${dir}/${xlsxName}`, xlsxBuffer),
    ]);
  }

  private async upload(path: string, contents: Buffer): Promise<void> {
    await this.dbx.filesUpload({ path, contents, mode: { '.tag': 'overwrite' } });
  }
}
