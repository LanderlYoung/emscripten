/**
 * @license
 * Copyright 2020 The Emscripten Authors
 * SPDX-License-Identifier: MIT
 */

/**
 * @param {number} idx
 * @param {number=} lengthInBytes
 * @return {string}
 */
function UTF8ArrayToStringNBytes(heap, idx, lengthInBytes) {
#if CAN_ADDRESS_2GB
  idx >>>= 0;
#endif
  var endPtr = idx + lengthInBytes;

#if TEXTDECODER == 2
  return UTF8Decoder.decode(
    heap.subarray ? heap.subarray(idx, endPtr) : new Uint8Array(heap.slice(idx, endPtr))
  );
#else // TEXTDECODER == 2
#if TEXTDECODER
  if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(heap.subarray(idx, endPtr));
  } else {
#endif // TEXTDECODER
    var str = '';

    while (idx < endPtr) {
      // For UTF8 byte structure, see:
      // http://en.wikipedia.org/wiki/UTF-8#Description
      // https://www.ietf.org/rfc/rfc2279.txt
      // https://tools.ietf.org/html/rfc3629
      var u0 = heap[idx++];
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      var u1 = heap[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      var u2 = heap[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
#if ASSERTIONS
        if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte 0x' + u0.toString(16) + ' encountered when deserializing a UTF-8 string on the asm.js/wasm heap to a JS string!');
#endif
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heap[idx++] & 63);
      }

      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
#if TEXTDECODER
  }
#endif // TEXTDECODER
  return str;
#endif // TEXTDECODER == 2
}

// Given a pointer 'ptr' to a UTF8-encoded string in the emscripten HEAP, returns a
// copy of that string as a Javascript String object.
// lengthInBytes:  specifies the number of bytes to read. The string at [ptr, ptr + lengthInBytes)
//                 will be decoded using utf8 encoding, and any \0 in between will be decoded as-is.
/**
 * @param {number} ptr
 * @param {number=} lengthInBytes
 * @return {string}
 */
function UTF8ToStringNBytes(ptr, lengthInBytes) {
#if CAN_ADDRESS_2GB
  ptr >>>= 0;
#endif
#if TEXTDECODER == 2
  if (!ptr) return '';
  var end = ptr + lengthInBytes;
  return UTF8Decoder.decode(HEAPU8.subarray(ptr, end));
#else
  return ptr ? UTF8ArrayToStringNBytes(HEAPU8, ptr, lengthInBytes) : '';
#endif
}

// Given a pointer 'ptr' to a UTF16-encoded string in the emscripten HEAP, returns a
// copy of that string as a Javascript String object.
// lengthInBytes:  specifies the number of bytes to read. The string at [ptr, ptr + lengthInBytes)
//                 will be decoded using utf8 encoding, and any \0 in between will be decoded as-is.
/**
 * @param {number} ptr
 * @param {number=} lengthInBytes
 * @return {string}
 */
function UTF16ToStringNBytes(ptr, lengthInBytes) {
#if ASSERTIONS
  assert(ptr % 2 == 0, 'Pointer passed to UTF16ToString must be aligned to two bytes!');
  assert(lengthInBytes % 2 == 0, 'Length passed to UTF16ToString must be a even number!');
#endif
#if TEXTDECODER
  var endPtr = ptr + lengthInBytes;

#if TEXTDECODER != 2
  if (endPtr - ptr > 32 && UTF16Decoder) {
#endif // TEXTDECODER != 2
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
#if TEXTDECODER != 2
  } else {
#endif // TEXTDECODER != 2
#endif // TEXTDECODER
    var i = 0;

    var lengthInCodeUnit = lengthInBytes / 2;
    var str = '';
    while (i < lengthInCodeUnit) {
      var codeUnit = {{{ makeGetValue('ptr', 'i*2', 'i16') }}};
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
#if TEXTDECODER && TEXTDECODER != 2
  }
#endif // TEXTDECODER
}

// Given a pointer 'ptr' to a UTF32-encoded string in the emscripten HEAP, returns a
// copy of that string as a Javascript String object.
// lengthInBytes:  specifies the number of bytes to read. The string at [ptr, ptr + lengthInBytes)
//                 will be decoded using utf8 encoding, and any \0 in between will be decoded as-is.
/**
 * @param {number} ptr
 * @param {number=} lengthInBytes
 * @return {string}
 */
function UTF32ToStringNBytes(ptr, lengthInBytes) {
#if ASSERTIONS
  assert(ptr % 4 == 0, 'Pointer passed to UTF32ToString must be aligned to four bytes!');
  assert(lengthInBytes % 4 == 0, 'Length passed to UTF32ToString must be multiple of 4!');
#endif
  var i = 0;

  var lengthInCodePoint = lengthInBytes / 4;
  var str = '';
  while (i < lengthInCodePoint) {
                              var utf32 = {{{ makeGetValue('ptr', 'i*4', 'i32') }}};
                              ++i;
                              // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
                              // See http://unicode.org/faq/utf_bom.html#utf16-3
                              if (utf32 >= 0x10000) {
                              var ch = utf32 - 0x10000;
                              str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
                              } else {
                              str += String.fromCharCode(utf32);
                              }
                              }
  return str;
}

mergeInto(LibraryManager.library, {
  UTF8ToStringNBytes: UTF8ToStringNBytes,
  UTF16ToStringNBytes: UTF16ToStringNBytes,
  UTF32ToStringNBytes: UTF32ToStringNBytes,
});

#if MINIMAL_RUNTIME

#include "runtime_strings_extra.js"
#include "arrayUtils.js"

mergeInto(LibraryManager.library, {
  $AsciiToString: AsciiToString,
  $stringToAscii: stringToAscii,
  $UTF16ToString: UTF16ToString,
  $stringToUTF16: stringToUTF16,
  $lengthBytesUTF16: lengthBytesUTF16,
  $UTF32ToString: UTF32ToString,
  $stringToUTF32: stringToUTF32,
  $lengthBytesUTF32: lengthBytesUTF32,
  $allocateUTF8: allocateUTF8,
  $allocateUTF8OnStack: allocateUTF8OnStack,
  $writeStringToMemory: writeStringToMemory,
  $writeArrayToMemory: writeArrayToMemory,
  $writeAsciiToMemory: writeAsciiToMemory,
  $intArrayFromString: intArrayFromString,
  $intArrayToString: intArrayToString
});

#endif
