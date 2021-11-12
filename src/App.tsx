import React, { useEffect, useState } from 'react';
import './App.css';
import PriorityQueue from 'priorityqueuejs'

import OrderBook from './views/OrderBook';

import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

import io from 'socket.io-client';

const socket = new WebSocket("wss://www.cryptofacilities.com/ws/v1")
// const END_POINT = "wss://www.cryptofacilities.com/ws/v1"

function App() {
  const [connected, setConnected] = useState(false)

  const [feed, setFeed] = useState<{} | null>(null)
  const [productID, setProductID] = useState<string>("PI_XBTUSD")

  const [message, setMessage] = useState()

  // const [socket, setSocket] = useState(null);

  // const [bidsPQ, setBidsPQ] = useState<PriorityQueue<number[]>>()
  // const [asksPQ, setAsksPQ] = useState<PriorityQueue<number[]>>()

  const [bidsArray, setBidsArray] = useState<number[][]>([])
  const [asksArray, setAsksArray] = useState<number[][]>([])


  useEffect(() => {
    socket.onopen = () => {
      console.log('connection established')
      setConnected(true)

      socket.send(generateMessage("subscribe", "PI_XBTUSD"))

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)

        // console.log(data)

        const ifEvent = data.hasOwnProperty('event')

        if (ifEvent) return // Info messages, we ignore them

        if (data.hasOwnProperty('numLevels')) { // snapshot messages
          initialize(data.numLevels, data.bids, data.asks)
          return
        }

        // then we have the atcual delta messages
        else {
          setBidsArray(prevState => {
            return [...prevState, ...data.bids]
            // .sort((a: number[], b: number[]) => {
            //   return a[0] - b[0]
            // })

          });
          setAsksArray(prevState => {
            return merge(prevState, data.asks)
            // return [...prevState, ...data.asks]
          });
        }
      }
    }
  }, [connected, asksArray, bidsArray])

  const initialize = (numLevels: number, bids: [], asks: []) => {

    console.log("Init")

    bids.sort((a, b) => {
      return a[0] - b[0]
    })

    asks.sort((a, b) => {
      return b[0] - a[0]
    })

    setBidsArray(bids);
    setAsksArray(asks);

    console.log(bidsArray)
    // console.log(asksArray)
  }

  const update = (bids: number[][], asks: number[][]) => {


  }

  // merge the incoming quotes with existing list (need to ensure matching order)
  // assuming both arry in ascending order
  const merge = (current: number[][], incoming: number[][]) => {
    console.log("attempting to merge", current, incoming)

    let merged: number[][] = []
    let c = 0 // pointer for current data
    let i = 0 // pointer for incoming data

    while (c < current.length && i < incoming.length) {
      console.log("fu")
      if (current[c][0] > incoming[i][0]) {
        if (incoming[i][1] != 0) merged.push(incoming[i])
        i++
      }
      else if (current[c][0] === incoming[i][0]) {
        if (incoming[i][1] != 0) merged.push(incoming[i])
        c++
        i++
      }
      else if (current[c][0] < incoming[i][0]) {
        merged.push(current[c])
        c++
      }
    }
    console.log("merged", merged);

    let res:number[][] = [];

    if (c < current.length) {
      res = merged.concat(current.slice(c))
      // current.slice(c).forEach((e)=>{merged.push(e)})
    }

    if (i < incoming.length) {
      res = merged.concat(incoming.slice(c))
    }
    console.log(res)

    return res
  }

  const stop = () => {
    // socket.send(generateMessage("unsubscribe", productID))
    socket.close()
    setConnected(false)
  }

  const asks = () => {

  }

  const spread = () => {
    if (bidsArray && asksArray) {
      // const highestBid = bidsArray[0][0]
      // const lowestAsk = asksArray[0][0]
      // return lowestAsk - highestBid
    }
  }

  // const total



  const toggleFeed = () => {
    if (connected) {
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
            <Col>Spread: {spread()}</Col>
          </Row>
          <Row className="toggleField ">
            <Col>Current Feed: {productID}</Col>
            <Col><Button onClick={toggleFeed}>Toggle Feed</Button></Col>
          </Row>
          <Row className="bookTable">
            <Col className="bid" md={6}>
              <Row>BID</Row>
              <Row>
                <Col>
                  <Row>PRICE</Row>
                  {/* {bidsArray?.map((e) =>
                    <Row key={e[0]}>{e[0]}</Row>)
                  } */}
                </Col>
                <Col>
                  <Row>SIZE</Row>
                  {/* {bidsArray?.map((e) =>
                    <Row key={e[0]}>{e[1]}</Row>)
                  } */}
                </Col>
                <Col>
                  <Row>TOTAL</Row>
                  {/* {bidsArray?.map((e) =>
                    <Row key={e[0]}>{e[2]}</Row>)
                  } */}
                </Col>
              </Row>
            </Col>
            <Col className="ask" md={6}>
              <Row>ASK</Row>
              <Row>
                <Col>
                  <Row>PRICE</Row>
                  {asksArray?.map((e) =>
                    <Row key={e[0]}>{e[0]}</Row>)
                  }
                </Col>
                <Col>
                  <Row>SIZE</Row>
                  {asksArray?.map((e) =>
                    <Row key={e[0]}>{e[1]}</Row>)
                  }
                </Col>
                <Col>
                  <Row>TOTAL</Row>
                  {/* {asksArray?.map((e) =>
                    <Row key={e[0]}>{e[2]}</Row>)
                  } */}
                </Col>
              </Row>

            </Col>

          </Row>

        </Container>

        <OrderBook />
      </header>
    </div>
  );
}

export default App;
