const express = require('express');
const path = require('path');
const { getAllAppointments } = require('./sheets');

function startDashboard() {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (req, res) => res.send('OK'));

  app.get('/', async (req, res) => {
    try {
      const appointments = await getAllAppointments();
      res.render('dashboard', {
        appointments,
        businessName: process.env.BUSINESS_NAME || 'My Business',
      });
    } catch {
      res.render('dashboard', {
        appointments: [],
        businessName: process.env.BUSINESS_NAME || 'My Business',
      });
    }
  });

  app.get('/api/appointments', async (req, res) => {
    try {
      const appointments = await getAllAppointments();
      res.json(appointments);
    } catch {
      res.json([]);
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
  });
}

module.exports = { startDashboard };
