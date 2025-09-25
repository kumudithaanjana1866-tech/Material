import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <header>
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div><strong>Workflows Engineering — Sprint 4</strong></div>
          <nav>
            <Link to="/" style={{textDecoration: pathname==='/'?'underline':undefined}}>Materials</Link>
            <Link to="/suppliers" style={{textDecoration: pathname==='/suppliers'?'underline':undefined}}>Suppliers</Link>
            <Link to="/analysis" style={{textDecoration: pathname==='/analysis'?'underline':undefined}}>Cost Analysis</Link>
          </nav>
        </div>
      </header>
      <div className="container">
        <Outlet />
      </div>
    </>
  );
}
