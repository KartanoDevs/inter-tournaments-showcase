import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/ping', (req, res) => {
  res.json({ message: 'Pong! El servidor Vongola funciona correctamente.' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Vongola Headquarters] Servidor escuchando en http://localhost:${PORT}`);
});
