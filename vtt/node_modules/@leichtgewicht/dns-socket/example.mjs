import { DNSSocket } from '@leichtgewicht/dns-socket'

const socket = new DNSSocket()

socket.query({
  flags: DNSSocket.RECURSION_DESIRED,
  questions: [{
    type: 'ANY',
    name: 'www.dr.dk'
  }]
}, 53, '8.8.8.8', function (err, response) {
  console.log(err, response)
  socket.destroy()
})
