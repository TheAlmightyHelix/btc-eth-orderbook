import React, { useEffect, useState } from 'react';
import './App.css';
import PriorityQueue from 'priorityqueuejs'

import OrderBook from './views/OrderBook';

import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';


function App() {




  return (
    <div className="App">
      <header className="App-header">

        <Container className="p-5 App-header">
          <OrderBook />
        </Container>
      </header>
    </div>
  );
}

export default App;
