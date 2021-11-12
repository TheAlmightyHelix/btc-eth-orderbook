import React, { useEffect, useState } from 'react';
import '../App.css';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';


const socket = new WebSocket("wss://www.cryptofacilities.com/ws/v1")

function OrderBook() {
    const [connected, setConnected] = useState(false)

    // const [feed, setFeed] = useState<{} | null>(null)
    const [productID, setProductID] = useState<string>("PI_XBTUSD")

    // const [message, setMessage] = useState()


    const [bidsArray, setBidsArray] = useState<number[][]>([])
    const [asksArray, setAsksArray] = useState<number[][]>([])
    const [bidsTotal, setBidsTotal] = useState<number[]>([])
    const [asksTotal, setAsksTotal] = useState<number[]>([])


    useEffect(() => {
        socket.onopen = () => {
            console.log('connection established')
            setConnected(true)

            // socket.send(generateMessage("subscribe", "PI_XBTUSD"))
            // start()

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data)

                // console.log(data)

                const ifEvent = data.hasOwnProperty('event')

                if (ifEvent) return // info messages, ignore them

                if (data.hasOwnProperty('numLevels')) { // snapshot messages
                    initialize(data.numLevels, data.bids, data.asks)
                    return
                }

                // then we have the atcual delta messages
                else {
                    setBidsArray(prevState => {
                        const newState = merge(prevState, data.bids, "bid")
                        setBidsTotal(calcTotal(newState))
                        return newState
                    });
                    setAsksArray(prevState => {
                        const newState = merge(prevState, data.asks, "ask")
                        setAsksTotal(calcTotal(newState))
                        return newState
                    });
                    // setBidsTotal(calcTotal(bidsArray))
                    // setAsksTotal(calcTotal(asksArray))
                }
            }
        }
    }, [connected, asksArray, bidsArray])

    // helper method for genterating socket messages
    const generateMessage = (event: string, productID: string) => {
        let message = {
            "event": event,
            "feed": "book_ui_1",
            "product_ids": [productID]
        }
        return JSON.stringify(message)
    }

    // initialize the orderbook when subscribed to a new feed
    const initialize = (numLevels: number, bids: [], asks: []) => {

        console.log("Init")

        bids.sort((a, b) => {
            return a[0] - b[0]
        })

        asks.sort((a, b) => {
            return b[0] - a[0]
        })

        setBidsArray(bids)
        setAsksArray(asks)
        setBidsTotal(calcTotal(bids))
        setAsksTotal(calcTotal(asks))
    }


    // merge the incoming quotes with existing list (need to ensure matching order)
    const merge = (curArray: number[][], incomingArray: number[][], type: string) => {

        // identify the price that needs to be updated
        let priceNeedToRemove = new Set()
        for (let i = 0; i < incomingArray.length; i++) {
            priceNeedToRemove.add(incomingArray[i][0])
        }

        // construct a new array: skip the record with the price to remove
        // Note that this does not hurt performance since states are immutable which requires a deep copy
        let merged: number[][] = []

        for (let i = 0; i < curArray.length; i++) {
            if (!priceNeedToRemove.has(curArray[i][0])) {
                merged.push(curArray[i])
            }
        }
        for (let i = 0; i < incomingArray.length; i++) {
            if (incomingArray[i][1] !== 0) {
                merged.push(incomingArray[i])
            }
        }

        if (type === "ask") {
            merged.sort((a: number[], b: number[]) => {
                return a[0] - b[0]
            })
        }

        if (type === "bid") {
            merged.sort((a: number[], b: number[]) => {
                return b[0] - a[0]
            })
        }

        return merged;
    }

    const start = () => {
        socket.send(generateMessage("subscribe", productID))
    }

    // halt the subscription
    const stop = () => {
        socket.send(generateMessage("unsubscribe", productID))
        // socket.close()
        // setConnected(false)
    }

    // calculate the spread
    const spread = () => {
        if (bidsArray.length > 0 && asksArray.length > 0) {
            console.log(bidsArray)
            const highestBid = bidsArray[0][0]
            const lowestAsk = asksArray[0][0]
            return (lowestAsk - highestBid).toFixed(2)
        }
    }

    // calculate total. Takes in the asks/bids array
    const calcTotal = (arr: number[][]) => {
        let total = [arr[0][1]]

        for (let i = 1; i < arr.length; i++) {
            total.push(total[i - 1] + arr[i][1])
        }

        return total
    }

    // calculate depth
    const depth = (total: number, minBid: number, maxAsk: number) => {
        return total / Math.max(minBid, maxAsk)
    }


    // toggle between two products: PI_XBTUSD and PI_ETHUSD
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





    return (
        <Container className="orderbook">
            <Row className="util">
                <Col md="auto"><Button onClick={stop}>stop</Button></Col>
                <Col md="auto"><Button onClick={start}>start</Button></Col>
            </Row>

            <Row className="header">
                <Col md={6} className="title">Order Book</Col>
                <Col md={6} className="heading">Spread: <span className="mono">{spread()}</span></Col>
            </Row>

            <Row className="bookTable">
                <Col className="bid" md={6}>
                    {/* <Row>BID</Row> */}
                    <Row className="justify-content-end">
                        <Col>
                            <Row className="tableHead heading justify-content-end">TOTAL</Row>
                            {bidsTotal?.map((e) =>
                                <Row key={e} className="mono justify-content-end">{e.toLocaleString()}</Row>)
                            }
                        </Col>
                        <Col>
                            <Row className="tableHead heading justify-content-end">SIZE</Row>
                            {bidsArray?.map((e) =>
                                <Row key={e[0]} className="mono justify-content-end">{e[1].toLocaleString()}</Row>)
                            }
                        </Col>
                        <Col>
                            <Row className="tableHead heading justify-content-end">PRICE</Row>
                            {bidsArray?.map((e) =>
                                <Row key={e[0]} className="mono red justify-content-end">{e[0].toFixed(2)}</Row>)
                            }
                        </Col>
                    </Row>
                </Col>
                <Col className="ask" md={6}>
                    {/* <Row>ASK</Row> */}
                    <Row>
                        <Col className="text-align-right">
                            <Row className="tableHead heading justify-content-end">PRICE</Row>
                            {asksArray?.map((e) =>
                                <Row key={e[0]} className="mono green justify-content-end">{e[0].toFixed(2)}</Row>)
                            }
                        </Col>
                        <Col className="">
                            <Row className="tableHead heading justify-content-end">SIZE</Row>
                            {asksArray?.map((e) =>
                                <Row key={e[0]} className="mono justify-content-end">{e[1].toLocaleString()}</Row>)
                            }
                        </Col>
                        <Col className="">
                            <Row className="tableHead heading justify-content-end">TOTAL</Row>
                            {asksTotal?.map((e) =>
                                <Row key={e} className="mono justify-content-end">{e.toLocaleString()}</Row>)
                            }
                        </Col>
                    </Row>
                </Col>
            </Row>

            <Row className="toggleFeed justify-content-center align-items-center mt-3">
                <Col md={3}>Current Feed: {productID}</Col>
                <Col md={3}><Button onClick={toggleFeed}>Toggle Feed</Button></Col>
            </Row>

        </Container>
    );
}


export default OrderBook;
