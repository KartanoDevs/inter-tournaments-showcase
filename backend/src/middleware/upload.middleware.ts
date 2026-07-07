import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/errors';

// Asegurarse de que el directorio base existe
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento inteligente
const storage = multer.diskStorage({
  destination: ( req, file, cb ) =>
  {
    let subFolder = 'misc';
    if ( req.originalUrl.includes( '/players' ) )
    {
      const parts = req.originalUrl.split( '?' )[ 0 ].split( '/' ); // Evitar query params si los hay
      const playersIndex = parts.indexOf( 'players' );
      const hasId = playersIndex !== -1 && parts.length > playersIndex + 1 && parts[ playersIndex + 1 ].length > 0;

      if ( hasId )
      {
        subFolder = `players/${ parts[ playersIndex + 1 ] }`; // Actualización: carpeta por ID
      } else
      {
        subFolder = 'temp'; // Creación: carpeta temporal
      }
    } else if ( req.originalUrl.includes( '/teams' ) )
    {
      const parts = req.originalUrl.split( '?' )[ 0 ].split( '/' );
      const teamsIndex = parts.indexOf( 'teams' );
      const hasId = teamsIndex !== -1 && parts.length > teamsIndex + 1 && parts[ teamsIndex + 1 ].length > 0;

      if ( hasId )
      {
        subFolder = `teams/${ parts[ teamsIndex + 1 ] }`;
      } else
      {
        subFolder = 'temp';
      }
    } else if ( req.originalUrl.includes( '/sponsors' ) )
    {
      subFolder = 'sponsors';
    } else if ( req.originalUrl.includes( '/events' ) )
    {
      subFolder = 'events';
    }

    const dir = path.join(uploadDir, subFolder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname( file.originalname );
    if ( req.originalUrl.includes( '/players' ) )
    {
      const parts = req.originalUrl.split( '?' )[ 0 ].split( '/' );
      const playersIndex = parts.indexOf( 'players' );
      const isUpdate = playersIndex !== -1 && parts.length > playersIndex + 1 && parts[ playersIndex + 1 ].length > 0;

      if ( isUpdate )
      {
        if ( file.fieldname === 'image' ) return cb( null, `profile${ ext }` );
        if ( file.fieldname === 'thumbnail' ) return cb( null, `thumbnail${ ext }` );
      }
    }

    if ( req.originalUrl.includes( '/teams' ) )
    {
      const parts = req.originalUrl.split( '?' )[ 0 ].split( '/' );
      const teamsIndex = parts.indexOf( 'teams' );
      const isUpdate = teamsIndex !== -1 && parts.length > teamsIndex + 1 && parts[ teamsIndex + 1 ].length > 0;

      if ( isUpdate )
      {
        if ( file.fieldname === 'logo' ) return cb( null, `logo${ ext }` );
      }
    }

    // Renombrar archivo temporal/misc para evitar colisiones
    const uniqueSuffix = Date.now() + '-' + Math.round( Math.random() * 1E9 );
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtro de seguridad: Sólo imágenes
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Formato de archivo no soportado. Sólo JPG, PNG, WEBP o SVG', 400));
  }
};

export const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Tope militar: 5MB por foto para no reventar el servidor de España
  }
});
