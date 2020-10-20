// Copyright 2013 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

#include <cassert>
#include <emscripten.h>
#include <stdio.h>
#include <string>
#include <string_view>
#include <wchar.h>

typedef unsigned int utf32;
typedef unsigned short utf16;

// This code tests that Unicode std::wstrings can be marshalled between C++ and JS.
int main() {
  std::wstring wstr =
    L"abc\u2603\u20AC\U0002007C123 --- abc\u2603\u20AC\U0002007C123"; // U+2603 is snowman, U+20AC
                                                                      // is the Euro sign, U+2007C
                                                                      // is a Chinese Han character
                                                                      // that looks like three
                                                                      // raindrops.

  printf("sizeof(wchar_t): %d.\n", (int)sizeof(wchar_t));

  if (sizeof(wchar_t) == 4) {
    utf32* memory = new utf32[wstr.length() + 1];

    EM_ASM(
      {
        var str = UTF32ToString($0);
        out(str);
        var numBytesWritten = stringToUTF32(str, $1, $2);
        if (numBytesWritten != 23 * 4)
          throw 'stringToUTF32 wrote an invalid length ' + numBytesWritten;
      },
      wstr.c_str(), memory, (wstr.length() + 1) * sizeof(utf32));

    // Compare memory to confirm that the string is intact after taking a route through JS side.
    const utf32* srcPtr = reinterpret_cast<const utf32*>(wstr.c_str());
    for (int i = 0;; ++i) {
      assert(memory[i] == srcPtr[i]);
      if (srcPtr[i] == 0)
        break;
    }

    EM_ASM(
      {
        var str = UTF32ToString($0);
        out(str);
        var numBytesWritten = stringToUTF32(str, $1, $2);
        if (numBytesWritten != 5 * 4)
          throw 'stringToUTF32 wrote an invalid length ' + numBytesWritten;
      },
      wstr.c_str(), memory, 6 * sizeof(utf32));
    assert(memory[5] == 0);

    // UTF32ToStringWithLength without null-terminate
    size_t dashIndex = wstr.find(L'-');
    std::wstring_view subString = std::wstring_view(wstr).substr(0, dashIndex + 1);
    int outLength = EM_ASM_INT(
      {
        var str = UTF32ToStringWithLength($0, $1);
        out(str);
        var expectedBytesWritten = $1;
        var numBytesWritten = stringToUTF32(str, $2, $3);
        if (numBytesWritten != expectedBytesWritten) {
          throw 'stringToUTF32 wrote an invalid length ' + numBytesWritten + ' != ' +
            expectedBytesWritten;
        }
        return numBytesWritten;
      },
      subString.data(), subString.length() * sizeof(utf32), memory,
      (wstr.length() + 1) * sizeof(utf32));
    assert(outLength == subString.length() * sizeof(utf32));

    // UTF32ToStringWithLength without '\0' inside
    std::wstring wstr2 = wstr;
    wstr2[dashIndex] = L'\0';
    int outLength2 = EM_ASM_INT(
      {
        var str = UTF32ToStringWithLength($0, $1);
        out(str);
        var expectedBytesWritten = $1;
        var numBytesWritten = stringToUTF32(str, $2, $3);
        if (numBytesWritten != expectedBytesWritten) {
          throw 'stringToUTF32 wrote an invalid length ' + numBytesWritten + ' != ' +
            expectedBytesWritten;
        }
        return numBytesWritten;
      },
      wstr2.c_str(), wstr2.length() * sizeof(utf32), memory, (wstr.length() + 1) * sizeof(utf32));
    assert(outLength2 == wstr2.length() * sizeof(utf32));
    assert(wstr2 == std::wstring_view((wchar_t*)memory, wstr2.length()));

    delete[] memory;
  } else { // sizeof(wchar_t) == 2, and we're building with -fshort-wchar.
    utf16* memory = new utf16[2 * wstr.length() + 1];

    EM_ASM(
      {
        var str = UTF16ToString($0);
        out(str);
        var numBytesWritten = stringToUTF16(str, $1, $2);
        if (numBytesWritten != 25 * 2)
          throw 'stringToUTF16 wrote an invalid length ' + numBytesWritten;
      },
      wstr.c_str(), memory, (2 * wstr.length() + 1) * sizeof(utf16));

    // Compare memory to confirm that the string is intact after taking a route through JS side.
    const utf16* srcPtr = reinterpret_cast<const utf16*>(wstr.c_str());
    for (int i = 0;; ++i) {
      assert(memory[i] == srcPtr[i]);
      if (srcPtr[i] == 0)
        break;
    }

    EM_ASM(
      {
        var str = UTF16ToString($0);
        out(str);
        var numBytesWritten = stringToUTF16(str, $1, $2);
        if (numBytesWritten != 5 * 2)
          throw 'stringToUTF16 wrote an invalid length ' + numBytesWritten;
      },
      wstr.c_str(), memory, 6 * sizeof(utf16));
    assert(memory[5] == 0);

    // UTF16ToStringWithLength without null-terminate
    size_t dashIndex = wstr.find(L'-');
    std::wstring_view subString = std::wstring_view(wstr).substr(0, dashIndex + 1);
    int outLength = EM_ASM_INT(
      {
        var str = UTF16ToStringWithLength($0, $1);
        out(str);
        var expectedBytesWritten = $1;
        var numBytesWritten = stringToUTF16(str, $2, $3);
        if (numBytesWritten != expectedBytesWritten) {
          throw 'stringToUTF16 wrote an invalid length ' + numBytesWritten + ' != ' +
            expectedBytesWritten;
        }
        return numBytesWritten;
      },
      subString.data(), subString.length() * sizeof(utf16), memory,
      (wstr.length() + 1) * sizeof(utf16));
    assert(outLength == subString.length() * sizeof(utf16));

    // UTF16ToStringWithLength without '\0' inside
    std::wstring wstr2 = wstr;
    wstr2[dashIndex] = L'\0';
    int outLength2 = EM_ASM_INT(
      {
        var str = UTF16ToStringWithLength($0, $1);
        out(str);
        var expectedBytesWritten = $1;
        var numBytesWritten = stringToUTF16(str, $2, $3);
        if (numBytesWritten != expectedBytesWritten) {
          throw 'stringToUTF16 wrote an invalid length ' + numBytesWritten + ' != ' +
            expectedBytesWritten;
        }
        return numBytesWritten;
      },
      wstr2.c_str(), wstr2.length() * sizeof(utf16), memory, (wstr.length() + 1) * sizeof(utf16));
    assert(outLength2 == wstr2.length() * sizeof(utf16));
    assert(wstr2 == std::wstring_view((wchar_t*)memory, wstr2.length()));

    delete[] memory;
  }

  printf("OK.\n");
}
