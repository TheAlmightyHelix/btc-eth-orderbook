import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import '../App.css';

import '../../node_modules/react-vis/dist/style.css'
import { XYPlot, HorizontalBarSeries, YAxis, XAxis } from 'react-vis';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';


const socket = new WebSocket("wss://www.cryptofacilities.com/ws/v1")

function OrderBook() {
    const [connected, setConnected] = useState(false)  // tracks whether socket is connected
    const [productID, setProductID] = useState<string>("PI_XBTUSD") // tracks current product id
    const [bidsArray, setBidsArray] = useState<number[][]>([]) // stores the array of current bids [price, size]
    const [asksArray, setAsksArray] = useState<number[][]>([]) // stores the array of current asks [price, size]
    const [bidsTotal, setBidsTotal] = useState<number[]>([]) // stores the array of total value for bids
    const [asksTotal, setAsksTotal] = useState<number[]>([]) // stores the array of total value for asks

    const [lineHeight, setLineHeight] = useState<number>(0)
    const tableRow = useRef<HTMLDivElement>(null);
    const [columnWidth, setColumnWidth] = useState<number>(0)
    const column = useRef<HTMLDivElement>(null);

    useEffect(() => {
        socket.onopen = () => {
            setConnected(true)

            // socket.send(generateMessage("subscribe", "PI_XBTUSD"))

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data)

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
                }
            }
        }


    }, [connected, asksArray, bidsArray])

    useLayoutEffect(() => {
        if (tableRow.current !== null) {
            setLineHeight(tableRow.current.offsetHeight)
        }
        if (column.current !== null) {
            setColumnWidth(column.current.offsetWidth)
        }
    }, [lineHeight, columnWidth])

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
    }

    // calculate the spread
    const spread = () => {
        if (bidsArray.length > 0 && asksArray.length > 0) {
            // console.log(bidsArray)
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
    const depth = (totals: number[], minBid: number, maxAsk: number) => {
        let depth: number[] = []
        totals.forEach((total) => {
            depth.push(total / Math.max(minBid, maxAsk))
        })
        return depth
    }

    const depths = (which: string) => {
        const minBid = bidsTotal[bidsTotal.length - 1]
        const maxAsk = asksTotal[asksTotal.length - 1]

        let depths: { x: number, y: number }[] = []
        if (which === "bids") {
            for (let i = 0; i < bidsTotal.length; i++) {
                depths.push({ x: bidsTotal[i] / Math.max(minBid, maxAsk), y: bidsTotal.length - i })
            }
        }
        else if (which === "asks") {
            for (let i = 0; i < asksTotal.length; i++) {
                depths.push({ x: asksTotal[i] / Math.max(minBid, maxAsk), y: asksTotal.length - i })
            }
        }
        // console.log(depths)
        return depths
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

            <Row className="tableHeadWrapper">
                <Col className="bids" md={6}>
                    <Row className="justify-content-end">
                        <Col ><Row className="tableHead heading justify-content-end">TOTAL</Row></Col>
                        <Col ><Row className="tableHead heading justify-content-end">SIZE</Row></Col>
                        <Col ><Row className="tableHead heading justify-content-end">PRICE</Row></Col>
                    </Row>
                </Col>
                <Col className="asks" md={6}>
                    <Row className="justify-content-end">
                        <Col ><Row className="tableHead heading justify-content-end">PRICE</Row></Col>
                        <Col ><Row className="tableHead heading justify-content-end">SIZE</Row></Col>
                        <Col ><Row className="tableHead heading justify-content-end">TOTAL</Row></Col>
                    </Row>
                </Col>
            </Row>

            <Row >
                <Container className="tableContainer">
                    <Row className="bookTable">
                        <Col className="bids" md={6}>
                            {/* BIDS */}
                            <Row className="justify-content-end">
                                <Col>
                                    {/* <Row className="tableHead heading justify-content-end">TOTAL</Row> */}
                                    {bidsTotal?.map((e) =>
                                        <Row key={e} className="mono justify-content-end">{e.toLocaleString()}</Row>)
                                    }
                                    <Row ref={tableRow}>_ </Row>
                                </Col>
                                <Col>
                                    {/* <Row className="tableHead heading justify-content-end">SIZE</Row> */}
                                    {bidsArray?.map((e) =>
                                        <Row key={e[0]} className="mono justify-content-end">{e[1].toLocaleString()}</Row>)
                                    }
                                </Col>
                                <Col>
                                    {/* <Row className="tableHead heading justify-content-end">PRICE</Row> */}
                                    {bidsArray?.map((e) =>
                                        <Row key={e[0]} className="mono red justify-content-end">{e[0].toFixed(2)}</Row>)
                                    }
                                </Col>
                            </Row>
                        </Col>
                        <Col ref={column} className="asks" md={6}>
                            {/* ASKS */}
                            <Row>
                                <Col className="">
                                    {/* <Row className="tableHead heading justify-content-end">PRICE</Row> */}
                                    {asksArray?.map((e) =>
                                        <Row key={e[0]} className="mono green justify-content-end">{e[0].toFixed(2)}</Row>)
                                    }
                                </Col>
                                <Col className="">
                                    {/* <Row className="tableHead heading justify-content-end">SIZE</Row> */}
                                    {asksArray?.map((e) =>
                                        <Row key={e[0]} className="mono justify-content-end">{e[1].toLocaleString()}</Row>)
                                    }
                                </Col>
                                <Col className="">
                                    {/* <Row className="tableHead heading justify-content-end">TOTAL</Row> */}
                                    {asksTotal?.map((e) =>
                                        <Row key={e} className="mono justify-content-end">{e.toLocaleString()}</Row>)
                                    }
                                </Col>
                            </Row>
                        </Col>
                    </Row>

                    <Row className="visualization">
                        <Col md={6}>
                            <XYPlot height={(lineHeight + 0.33) * bidsTotal.length} width={columnWidth} xDomain={[0, 1]} >
                                <HorizontalBarSeries
                                    data={depths("bids")}
                                    barWidth={1}
                                    color="#8d3236"
                                    opacity={0.5}

                                />
                            </XYPlot>
                        </Col>
                        <Col md={6}>
                            <XYPlot height={(lineHeight + 0.33) * asksTotal.length} width={columnWidth} xDomain={[0, 1]} >
                                <HorizontalBarSeries
                                    data={depths("asks")}
                                    barWidth={1}
                                    color="#4b805e"
                                    opacity={0.5}
                                />
                            </XYPlot>
                        </Col>
                    </Row>
                </Container>
            </Row>



            <Row className="toggleFeed justify-content-center align-items-center mt-3">
                <Col md={3}>Current Feed: {productID}</Col>
                <Col md={3}><Button onClick={toggleFeed}>Toggle Feed</Button></Col>
            </Row>



        </Container>
    );
}


export default OrderBook;
