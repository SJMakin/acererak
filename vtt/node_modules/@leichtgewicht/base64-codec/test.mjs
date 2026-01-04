import test from 'fresh-tape'
import { base64, base64URL, make, PREFERS_PADDING } from './index.mjs'

const testData = [
  [[], '', 'empty'],
  [[0x00], 'AA=='],
  [[0x01], 'AQ=='],
  [[0x02], 'Ag=='],
  [[0x10], 'EA=='],
  [[0x20], 'IA=='],
  [[0xff], '/w=='],
  [[0x01, 0x01], 'AQE='],
  [[0xff, 0xff], '//8='],
  [[0x01, 0x01, 0x01], 'AQEB'],
  [[0xff, 0xff, 0xff], '////'],
  [[0x01, 0x01, 0x01, 0xff], 'AQEB/w=='],
  [[0x01, 0x01, 0x01, 0xff, 0x2f], 'AQEB/y8='],
  [[0x01, 0x01, 0x01, 0xff, 0x2f, 0x2f], 'AQEB/y8v'],
  [
    [0x00, 0x10, 0x83, 0x10, 0x51, 0x87, 0x20, 0x92, 0x8b, 0x30, 0xd3, 0x8f, 0x41, 0x14, 0x93, 0x51, 0x55, 0x97, 0x61, 0x96, 0x9b, 0x71, 0xd7, 0x9f, 0x82, 0x18, 0xa3, 0x92, 0x59, 0xa7, 0xa2, 0x9a, 0xab, 0xb2, 0xdb, 0xaf, 0xc3, 0x1c, 0xb3, 0xd3, 0x5d, 0xb7, 0xe3, 0x9e, 0xbb, 0xf3, 0xdf, 0xbf],
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    'the entire charset'
  ],
  [[-1], '/w==', 'negative input'],
  [[256], 'AA==', 'too large input']
]

testData.forEach(function (parts) {
  let [codes, str, name] = parts
  if (name === 0) {
    name = `test: ${str}`
  }
  const buf = new Uint8Array(codes)
  test(name, function (t) {
    t.equals(base64.encodingLength(str), codes.length, `encodingLength == ${codes.length}`)
    t.equals(base64.decode(buf), str, `decode(${codes})`)
    t.same(base64.encode(str), buf, `encode(${str})`)
    t.end()
  })
})

test('positional encoding', function (t) {
  [
    ['AQEv', [0x01, 0x01, 0x2f]],
    ['JvI=', [0x26, 0xf2]],
    ['Jg==', [0x26]]
    // ['AQ==', []]
  ].forEach(function (fixture) {
    const [str, bytes] = fixture
    const size = base64.encodingLength(str)
    const buf = new Uint8Array(size + 4)
    buf[0] = 0x11
    buf[1] = 0x22
    buf[2 + size] = 0x33
    buf[2 + size + 1] = 0x44
    const checkBuf = new Uint8Array([0x11, 0x22, ...bytes, 0x33, 0x44])
    base64.encode.bytes = 0
    t.equals(base64.encode(str, buf, 2), buf, 'correct buffer is returned')
    t.equals(base64.encode.bytes, size, 'encode.bytes')
    t.same(buf, checkBuf, `encode(${str}, buf, 2)`)
    base64.decode.bytes = 0
    t.equals(base64.decode(checkBuf, 2, 2 + size), str, `decode([${checkBuf}], 2, ${2 + size})`)
    t.equals(base64.decode.bytes, size, 'decode.bytes')
  })
  t.end()
})

test('url compatible decoding', function (t) {
  [
    ['_w', [0xff]],
    ['AQE', [0x01, 0x01]],
    ['AQE-B_y8', [0x01, 0x01, 0x3e, 0x07, 0xfc, 0xbc]]
  ].forEach(function (fixture) {
    const [str, bytes] = fixture
    t.same(
      base64URL.encode(str),
      new Uint8Array(bytes)
    )
    t.equals(
      base64URL.decode(bytes),
      str
    )
  })
  t.end()
})

test('expected output of concatinated base64s', function (t) {
  // https://en.wikipedia.org/wiki/Base64#Output_padding
  const str = 'AA==aab='
  t.same(base64.encode(str), new Uint8Array([0x00, 0x00, 0x00, 0x69, 0xa6]))
  t.end()
})

test('making API', function (t) {
  const custom = make('fancy', 'a$CDEFGHIJKLMNOPQRSTUVWXYZA[cdefghijklmnopqrstuvwxyz0123456789+/', '~', PREFERS_PADDING)
  t.equals(custom.name, 'fancy')
  t.same(custom.encode('PP~~'), new Uint8Array([0x3c]))
  t.equals(custom.decode(new Uint8Array([0x00, 0x32, 0x14, 0xff, 0x1f])), 'aDIU/x8~')
  t.throws(function () {
    make('foo', '', '')
  }, /Charset needs to be 64 characters long/)
  t.throws(function () {
    make('foo', 'a$CDĀEGHIJKLMNOPQRSTUVWXYZA[cdefghijklmnopqrstuvwxyz0123456789+/', '')
  }, /Character #4 in charset \[code=256, char=Ā\] is too high! \(max=255\)/)
  t.throws(function () {
    make('foo', 'a$CDEFGHHJKLMNOPQRSTUVWXYZA[cdefghijklmnopqrstuvwxyz0123456789+/', '')
  }, /Character \[code=72, char=H\] is more than once in the charset!/)
  t.end()
})
