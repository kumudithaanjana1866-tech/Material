import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom';
import App from './App';
import Materials from './pages/Materials';
import Suppliers from './pages/Suppliers';
import CostAnalysis from './pages/CostAnalysis';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Materials /> },
      { path: 'suppliers', element: <Suppliers /> },
      { path: 'analysis', element: <CostAnalysis /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router}/>
  </React.StrictMode>
);
