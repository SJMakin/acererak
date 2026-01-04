import dgram from 'dgram'
import * as packet from '@leichtgewicht/dns-packet'
import { EventEmitter } from 'events'
import { Buffer } from 'buffer'

export class DNSSocket extends EventEmitter {
  constructor (opts = {}) {
    super()

    this.retries = opts.retries !== undefined ? opts.retries : 5
    this.timeout = opts.timeout || 7500
    this.timeoutChecks = opts.timeoutChecks || (this.timeout / 10)
    this.destroyed = false
    this.inflight = 0
    this.raw = opts.raw === true
    this.maxQueries = opts.maxQueries || 10000
    this.maxRedirects = opts.maxRedirects || 0
    this.socket = opts.socket || dgram.createSocket('udp4')
    this._id = Math.ceil(Math.random() * this.maxQueries)
    this._queries = new Array(this.maxQueries).fill(null)
    this._interval = null

    this.socket.on('error', err => {
      if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
        this.emit('error', err)
      } else {
        this.emit('warning', err)
      }
    })
    this.socket.on('message', (message, rinfo) => {
      this._onmessage(message, rinfo)
    })

    const onlistening = () => {
      this._interval = setInterval(() => this._ontimeoutCheck(), this.timeoutChecks)
      this.emit('listening')
    }

    if (isListening(this.socket)) onlistening()
    else this.socket.on('listening', onlistening)
    this.socket.on(
      'close',
      () => this.emit('close')
    )
  }

  address () {
    return this.socket.address()
  }

  bind (...args) {
    const onlistening = args.length > 0 && args[args.length - 1]
    if (typeof onlistening === 'function') {
      this.once('listening', onlistening)
      this.socket.bind(...args.slice(0, -1))
    } else {
      this.socket.bind(...args)
    }
  }

  destroy (onclose) {
    if (onclose) {
      this.once('close', onclose)
    }
    if (this.destroyed) {
      return
    }
    this.destroyed = true
    clearInterval(this._interval)
    this.socket.close()

    for (let i = 0; i < this.maxQueries; i++) {
      const q = this._queries[i]
      if (q) {
        q.callback(new Error('Socket destroyed'))
        this._queries[i] = null
      }
    }
    this.inflight = 0
  }

  _ontimeoutCheck () {
    const now = Date.now()
    for (let i = 0; i < this.maxQueries; i++) {
      const q = this._queries[i]

      if ((!q) || (now - q.firstTry < (q.tries + 1) * this.timeout)) {
        continue
      }

      if (q.tries > this.retries) {
        this._queries[i] = null
        this.inflight--
        this.emit('timeout', q.query, q.port, q.host)
        q.callback(new Error('Query timed out'))
        continue
      }
      q.tries++
      this.socket.send(q.buffer, 0, q.buffer.length, q.port, Array.isArray(q.host) ? q.host[Math.floor(q.host.length * Math.random())] : q.host || '127.0.0.1')
    }
  }

  _shouldRedirect (q, result) {
    // no redirects, no query, more than 1 questions, has any A record answer
    if (this.maxRedirects <= 0 || (!q) || (q.query.questions.length !== 1) || result.answers.filter(e => e.type === 'A').length > 0) {
      return false
    }

    // no more redirects left
    if (q.redirects > this.maxRedirects) {
      return false
    }

    const cnameresults = result.answers.filter(e => e.type === 'CNAME')
    if (cnameresults.length === 0) {
      return false
    }

    const id = this._getNextEmptyId()
    if (id === -1) {
      q.callback(new Error('Query array is full!'))
      return true
    }

    // replace current query with a new one
    q.query = {
      id: id + 1,
      flags: packet.RECURSION_DESIRED,
      questions: [{
        type: 'A',
        name: cnameresults[0].data
      }]
    }
    q.redirects++
    q.firstTry = Date.now()
    q.tries = 0
    q.buffer = Buffer.alloc(packet.encodingLength(q.query))
    packet.encode(q.query, q.buffer)
    this._queries[id] = q
    this.socket.send(q.buffer, 0, q.buffer.length, q.port, Array.isArray(q.host) ? q.host[Math.floor(q.host.length * Math.random())] : q.host || '127.0.0.1')
    return true
  }

  _onmessage (buffer, rinfo) {
    let message

    try {
      message = packet.decode(buffer)
    } catch (err) {
      this.emit('warning', err)
      return
    }

    if (message.type === 'response' && message.id) {
      const q = this._queries[message.id - 1]
      if (q) {
        this._queries[message.id - 1] = null
        this.inflight--

        if (!this._shouldRedirect(q, message)) {
          q.callback(null, message)
        }
      }
    }

    this.emit(message.type, message, rinfo.port, rinfo.address)
  }

  unref () {
    this.socket.unref()
  }

  ref () {
    this.socket.ref()
  }

  response (query, response, port, host) {
    if (this.destroyed) {
      return
    }

    response.type = 'response'
    response.id = query.id
    const buffer = Buffer.alloc(packet.encodingLength(response))
    packet.encode(response, buffer)
    this.socket.send(buffer, 0, buffer.length, port, host)
  }

  cancel (id) {
    const q = this._queries[id]
    if (!q) return

    this._queries[id] = null
    this.inflight--
    q.callback(new Error('Query cancelled'))
  }

  setRetries (id, retries) {
    const q = this._queries[id]
    if (!q) return
    q.firstTry = q.firstTry - this.timeout * (retries - q.retries)
    q.retries = this.retries - retries
  }

  _getNextEmptyId () {
    // try to find the next unused id
    let id = -1
    for (let idtries = this.maxQueries; idtries > 0; idtries--) {
      const normalizedId = (this._id + idtries) % this.maxQueries
      if (this._queries[normalizedId] === null) {
        id = normalizedId
        this._id = (normalizedId + 1) % this.maxQueries
        break
      }
    }
    return id
  }

  query (query, port, host, cb) {
    if (this.destroyed) {
      cb(new Error('Socket destroyed'))
      return 0
    }

    this.inflight++
    query.type = 'query'
    query.flags = typeof query.flags === 'number' ? query.flags : DNSSocket.RECURSION_DESIRED

    const id = this._getNextEmptyId()
    if (id === -1) {
      cb(new Error('Query array is full!'))
      return 0
    }

    query.id = id + 1
    const buffer = Buffer.alloc(packet.encodingLength(query))
    packet.encode(query, buffer)

    this._queries[id] = {
      callback: cb || noop,
      redirects: 0,
      firstTry: Date.now(),
      query,
      tries: 0,
      buffer,
      port,
      host
    }
    this.socket.send(buffer, 0, buffer.length, port, Array.isArray(host) ? host[Math.floor(host.length * Math.random())] : host || '127.0.0.1')
    return id
  }
}

DNSSocket.RECURSION_DESIRED = DNSSocket.prototype.RECURSION_DESIRED = packet.RECURSION_DESIRED
DNSSocket.RECURSION_AVAILABLE = DNSSocket.prototype.RECURSION_AVAILABLE = packet.RECURSION_AVAILABLE
DNSSocket.TRUNCATED_RESPONSE = DNSSocket.prototype.TRUNCATED_RESPONSE = packet.TRUNCATED_RESPONSE
DNSSocket.AUTHORITATIVE_ANSWER = DNSSocket.prototype.AUTHORITATIVE_ANSWER = packet.AUTHORITATIVE_ANSWER
DNSSocket.AUTHENTIC_DATA = DNSSocket.prototype.AUTHENTIC_DATA = packet.AUTHENTIC_DATA
DNSSocket.CHECKING_DISABLED = DNSSocket.prototype.CHECKING_DISABLED = packet.CHECKING_DISABLED

function noop () {
}

function isListening (socket) {
  try {
    return socket.address().port !== 0
  } catch (err) {
    return false
  }
}
