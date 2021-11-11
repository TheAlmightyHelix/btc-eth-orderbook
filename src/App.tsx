import React, { useEffect, useState } from 'react';
import './App.css';
import OrderBook from './views/OrderBook';

import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

const socket = new WebSocket("wss://www.cryptofacilities.com/ws/v1")

function App() {
  const [connected, setConnected] = useState(false)
  const [data, setData] = useState<{} | null>(null)
  const [feed, setFeed] = useState<{} | null>(null)
  const [productID, setProductID] = useState<string>("PI_XBTUSD")

  // const [message, setMessage] = useState()

  // const [spread, setSpread] = useState<number>()

  useEffect(() => {
    socket.onopen = () => {
      // console.log('connection established')
      // setConnected(true)

      socket.send('{"event":"subscribe","feed":"book_ui_1","product_ids":["PI_XBTUSD"]}')

      socket.onmessage = (event) => {
        // const data = JSON.parse(event.data)
        const data = event.data;
        console.log(data)

        setData(data)
      } 
    }
  }, [setConnected, setData])

  const communicationStart = () => {

  }

  const stop = () => {
    // socket.send(generateMessage("unsubscribe", productID))
    socket.close()
  }

  const asks = () => {
    // let entries: JSX.Element[] = []
    // let entries: string[] = []
    // if (data) {
    //   data?.asks?.forEach(element => {
    //     entries.push(`Price: ${element[0]}, Size: ${element[1]}`)
    //   });
    // }
    // return entries
  }

  const spread = () => {
    const highestBid = 100
    const lowestAsk = 110
    return lowestAsk - highestBid
  }

  // const total



  const toggleFeed = () => {
    socket.send(generateMessage("unsubscribe", productID))
    if (productID === "PI_XBTUSD") {
      socket.send(generateMessage("subscribe", "PI_ETHUSD"))
      setProductID("PI_ETHUSD")
    }
    else if (productID === "PI_ETHUSD") {
      socket.send(generateMessage("subscribe", "PI_XBTUSD"))
      setProductID("PI_XBTUSD")
    }
  }

  const generateMessage = (event: string, productID: string) => {
    let message = {
      "event": event,
      "feed": "book_ui_1",
      "product_ids": [productID]
    }
    return JSON.stringify(message)
  }



  return (
    <div className="App">
      <header className="App-header">
        <Button onClick={stop}>stop</Button>


        <Container>
          <Row className="header">
            <Col>Spread: {13} ({12.5}%)</Col>
          </Row>
          <Row className="toggleField ">
            <Col>Current Feed: {productID}</Col>
            <Col><Button onClick={toggleFeed}>Toggle Feed</Button></Col>
          </Row>
          <Row className="bookTable">
            <Col className="ask">
              <Row>ask</Row>
              {/* {asks()} */}
              {/* {data?.feed} */}
              {data}
            </Col>
            <Col className="bid">
              <Row>bid</Row>
            </Col>
          </Row>

        </Container>

        <OrderBook />
      </header>
    </div>
  );
}

export default App;
