import React, { useEffect, useState } from 'react';
// import './App.css';

const socket = new WebSocket("wss://www.cryptofacilities.com/ws/v1");
// '{"event":"subscribe","feed":"book_ui_1","product_ids":["PI_XBTUSD"]}'

function OrderBook() {
    

    

    return (
        <div className="orderBook">
            <p>
                {/* Order Book */}
            </p>
        </div>
    );
}

export default OrderBook;
