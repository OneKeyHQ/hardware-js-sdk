//
//  String+hexadecimal.swift
//  native-ios-example
//
//  Created by Leon on 2023/8/12.
//

import Foundation

fileprivate func convertHex(_ s: String.UnicodeScalarView, i: String.UnicodeScalarIndex, appendTo d: [UInt8]) -> [UInt8] {

    let skipChars = CharacterSet.whitespacesAndNewlines

    guard i != s.endIndex else { return d }

    let next1 = s.index(after: i)

    if skipChars.contains(s[i]) {
        return convertHex(s, i: next1, appendTo: d)
    } else {
        guard next1 != s.endIndex else { return d }
        let next2 = s.index(after: next1)

        let sub = String(s[i..<next2])

        guard let v = UInt8(sub, radix: 16) else { return d }

        return convertHex(s, i: next2, appendTo: d + [ v ])
    }
}

extension String {

    /// Convert Hexadecimal String to Array<UInt>
    ///     "0123".hex                // [1, 35]
    ///     "aabbccdd 00112233".hex   // 170, 187, 204, 221, 0, 17, 34, 51]
    var hex : [UInt8] {
        return convertHex(self.unicodeScalars, i: self.unicodeScalars.startIndex, appendTo: [])
    }

    /// Convert Hexadecimal String to Data
    ///     "0123".hexData                    /// 0123
    ///     "aa bb cc dd 00 11 22 33".hexData /// aabbccdd 00112233
    var hexData : Data {
        return Data(convertHex(self.unicodeScalars, i: self.unicodeScalars.startIndex, appendTo: []))
    }
}

extension Data {
    var hexString : String {
        return self.reduce("") { (a : String, v : UInt8) -> String in
            return a + String(format: "%02x", v)
        }
    }
}

