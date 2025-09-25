const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

dotenv.config();

const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));

// Routes
app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
connectDB(process.env.MONGODB_URI)
  .then(() => app.listen(port, () => console.log(`🚀 API on http://localhost:${port}`)))
  .catch(err => {
    console.error('DB connection failed', err);
    process.exit(1);
  });
