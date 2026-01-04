# @leichtgewicht/base64-codec

A javascript-only (esm/cjs) base64 codec that is [abstract-encoding][] compatible,
well-tested and pretty efficient. Bonus: It doesn't use Nodejs' Buffer object
and comes with typescript types.

[abstract-encoding]: https://github.com/mafintosh/abstract-encoding

## Usage

```js
import { base64 } from '@leichtgewicht/base64-codec' // require works too!

const str = 'AA=='
const bytes = base64.encode(
  str,
  new Uint8Array(base64.encodingLength(str)), // own buffer supplied, optional
  0 // offset, at which to write the str, optional
)
str === base64.decode(bytes, 0, bytes.length)
```

## URL Support

Use `base64URL` for de-/encoding for the URL variant of base64.

```js
import { base64URL } from '@leichtgewicht/base64-codec'
```

## Concatenated Buffer

For performance reasons, this codec **does not** support [concatenated
base64 strings](https://en.wikipedia.org/wiki/Base64#Output_padding).

If you need to encode concatenated strings, split them before passing them to this codec.

## Why?

There are plenty of base64 implementations on NPM, but when looking into
them there was none with cjs/esm support that offered positional encoding
and bringing one owns buffer.

## License

[MIT](./LICENSE)
