import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { errorHandler } from './middleware/error-handler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import teamRoutes from './routes/team.routes';
import playerRoutes from './routes/player.routes';

import sponsorRoutes from './routes/sponsor.routes';
import tournamentRoutes from './routes/tournament.routes';

const app = express();

// ==========================================
// MIDDLEWARES DE SEGURIDAD Y OPTIMIZACIÓN
// ==========================================

// Helmet con CSP relajada para imágenes cross-origin entre frontend (4200) y backend (3000)
app.use( helmet( {
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permite que el browser cargue estos recursos desde otro origen
} ) );
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || '*' })); // Permitir todo por defecto en dev
app.use(compression());

// Parseador de Body (Para URLs pesadas o imágenes Base64 grandes como las de Sponsor)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Exponer la carpeta public/uploads para servir imágenes directamente
app.use('/public', express.static('public'));

// Request Logging Avanzado (Estilo Vongola)
app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on( 'finish', () =>
  {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Colores ANSI
    const methodColor = '\x1b[36m'; // Cyan
    const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[35m' : '\x1b[32m'; // Red, Yellow, Magenta, Green
    const reset = '\x1b[0m';
    const timeColor = duration > 500 ? '\x1b[33m' : '\x1b[90m'; // Yellow si es lento, Gris si es normal

    let logMessage = `[API] ${ methodColor }${ req.method }${ reset } ${ req.originalUrl } ${ statusColor }${ status }${ reset } ${ timeColor }${ duration }ms${ reset }`;

    // Si hay parámetros relevantes, los imprimimos de forma segura
    if ( req.query && Object.keys( req.query ).length > 0 )
    {
      logMessage += `\n      --> Query: ${ JSON.stringify( req.query ) }`;
    }

    if ( req.body && Object.keys( req.body ).length > 0 && req.method !== 'GET' )
    {
      // Ignoramos campos gigantes o sensibles
      const safeBody = { ...req.body };
      if ( safeBody.password ) safeBody.password = '***';
      if ( safeBody.token ) safeBody.token = '***';
      // Logs cortos
      const bodyStr = JSON.stringify( safeBody );
      logMessage += `\n      --> Body:  ${ bodyStr.length > 200 ? bodyStr.substring( 0, 200 ) + '... (truncado)' : bodyStr }`;
    }

    console.log( logMessage );
  } );

  next();
});

// ==========================================
// REGISTRO DE RUTAS
// ==========================================

// Endpoint de prueba (*Healthcheck*)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date(), message: 'Server is running Vongola Edition' });
});

// Registrar routers modulares
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);

app.use('/api/sponsors', sponsorRoutes);
app.use('/api/tournaments', tournamentRoutes);

// Manejador global de rutas inexistentes (404)
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: `Ruta ${req.originalUrl} no encontrada en este servidor` });
});

// ==========================================
// GESTIÓN GLOBAL DE ERRORES (Debe ser el último middleware)
// ==========================================
app.use(errorHandler);

// Inicialización del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 El Servidor está corriendo maestralmente en el puerto http://localhost:${PORT}`);
});
