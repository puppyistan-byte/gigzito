import express from 'express';
import cors from 'cors';
import flameRoutes from './routes/flameRoutes';

const app = express();
app.use(cors());
app.use(express.json());

// Gig Flames API Entry
app.use('/api/flame', flameRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Switchboard active on port ' + PORT);
});
