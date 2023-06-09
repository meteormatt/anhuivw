const WebSocket = require('ws');
const fs = require('fs');
const { Transform } = require('stream');
const os = require('node:os');
const axios = require('axios').default;
const boxIP = '192.168.2.29'
const ws = new WebSocket(`ws://${boxIP}:6001`);

var requestId = 10;
// var data_list = [];

ws.on('open', function open() {
  setInterval(() => {
    ws.send(
      JSON.stringify({
        opcode: "heartbeat",
        requestId: requestId++,
      })
    );
  }, 5000);

  ws.send(JSON.stringify({
    opcode: "addChannel",
    requestId: requestId++,
    data: {
      channel: "ipdu.can.*.*",
      codec: [],
    },
  }))

  ws.send(JSON.stringify({
    opcode: "setRule",
    requestId: requestId++,
    data: {
      rule: "function test(pdu) {return true}",
    },
  })
  )
});

ws.on('message', async function message(data) {
  let result = JSON.parse(data)
  if (result['opcode'] == 'subscribe') {
    // 开空调
    await axios.post(`http://${boxIP}/api/simulation/ipdu/can/can2`, {
      "id": "0x17330100",
      "payload": "20 4D 10",
      "isExtended": true,
      "isCANFD": true
    })
    if (result.data && result.data.length > 0) {
      for (const pdu of result.data) {
        // console.log(pdu);
        if (pdu.portID == 'can1' && pdu.dir == 'rx' && pdu.id == 0x17330100 && pdu.data.data == [32, 77, 16]) {
          console.log('EV-CAN上收到 ID:0x17330100 payload:20 4D 10 的状态信号')
        }
      }
    }
  }
});

ws.on('close', (code, reason) => {
  console.log(new Date(), code, reason)
  process.exit()
})

ws.on('error', (error) => {
  console.log(new Date(), error)
  process.exit()
})

console.log(new Date())

// 增加换行符，Windows中为\r\n, Linux为\n
const transformer = new Transform({
  transform(chunk, enc, callback) {
    callback(null, chunk + os.EOL);
  }
})

WebSocket.createWebSocketStream(ws).pipe(transformer).pipe(fs.createWriteStream('trace_js.txt'))