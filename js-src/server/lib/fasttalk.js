'use strict'

let u32 = new Uint32Array(1)
let c32 = new Uint8Array(u32.buffer)
let f32 = new Float32Array(u32.buffer)

let u16 = new Uint16Array(1)
let c16 = new Uint8Array(u16.buffer)

/** Header Codes
 * S = sign bit, 0 = positive or 0, 1 = negative
 * 0000 - 0 or false
 * 0001 - 1 or true
 * 001S - 8 bit
 *
 * 010S - 16 bit
 * 011S - 32 bit
 *
 * 1000 - float
 * 1001 - single optional non null byte string
 * 1010 - 8 bit null-terminated string
 * 1011 - 16 bit null-terminated string
 *
 * 1100 - repeat again twice
 * 1101 - repeat again thrice
 * 1110 - repeat 4 + n times (0 <= n < 16)
 * 1111 - end of header
 */

/** An explanation of the new protocol - fasttalk 2.0
 * The new fasttalk system, named fasttalk 2.0, is designed to be backward compatible with fasttalk 1.0.
 * Instead of operating on a string, the data is put onto a Uint8Array, which makes it much faster.
 * The type indicators are also made shorter, changing from 1 byte to 4 bits, and special compressions for 0 and 1 and type repeats are also added, which reduced bandwidth usage.
 * 
 * The algorithm compresses an array of JavaScript numbers and strings into a single packets. Booleans are automatically casted to 0 and 1.
 * Each packet consists of two main parts: the header codes, and the data.
 * The header codes are 4 bit each, and there must be an even number of them.
 * In a packet, the header code always start and end with code 15 (0b1111). The actual headers are put between them. The starting code allows the client to instantly check to see which version of the protocol is used, and fall back if necessary. The encding codes allows the client to signal the start of the data section. Since there must be an even number of header codes, if there is an odd number of headers, there will be two code 15s at the end instead of only one.
 * 
 * When the data is being compressed, each element of the array is labeled to one of 12 types, which is the first 12 header codes in the table above. If more than 3 header codes of the same type is used, they are compressed into shorter blocks to indicate repeats.
 */

let encode = message => {
    let headers = []
    let headerCodes = []
    let contentSize = 0
    let lastTypeCode = 0b1111
    let repeatTypeCount = 0
    for (let block of message) {
        let typeCode = 0
        if (block === 0 || block === false) {
            typeCode = 0b0000
        } else if (block === 1 || block === true) {
            typeCode = 0b0001
        } else if (typeof block === 'number') {
        if (!Number.isInteger(block) || block < -0x100000000 || block >= 0x100000000) {
            typeCode = 0b1000
            contentSize += 4
        } else if (block >= 0) {
            if (block < 0x100) {
                typeCode = 0b0010
                contentSize++
            } else if (block < 0x10000) {
                typeCode = 0b0100
                contentSize += 2
            } else if (block < 0x100000000) {
                typeCode = 0b0110
                contentSize += 4
            }
        } else {
            if (block >= -0x100) {
                typeCode = 0b0011
                contentSize++
            } else if (block >= -0x10000) {
                typeCode = 0b0101
                contentSize += 2
            } else if (block >= -0x100000000) {
                typeCode = 0b0111
                contentSize += 4
            }
        }
        } else if (typeof block === 'string') {
            let hasUnicode = false
            for (let i = 0; i < block.length; i++) {
                if (block.charAt(i) > '\xff') {
                    hasUnicode = true
                } else if (block.charAt(i) === '\x00') {
                    console.error('Null containing string', block)
                    throw new Error('Null containing string')
                }
            }
            if (!hasUnicode && block.length <= 1) {
                typeCode = 0b1001
                contentSize++
            } else if (hasUnicode) {
                typeCode = 0b1011
                contentSize += block.length * 2 + 2
            } else {
                typeCode = 0b1010
                contentSize += block.length + 1
            }
        } else {
            console.error("Unencodable data type:", block);
            let packetType = message[0];
            console.error(`Packet type: ${packetType}`);
            console.error(`Unencoded packet: \n${message.join(' ')}`);
            if (packetType == 'u') {
                console.error(`\nThis is an uplink (u) packet. Typically, the error comes from an invalid value in the socket's view data, meaning it's related to entities.`);
                console.error(`For that, check socket.js flatten() for invalid values. These are because the corresponding values in entity.js Entity.prototype.camera() are also invalid.`);
                console.error(`It's advised to count forwards or backwards from the easily discernable values of 65535 for health/shield fraction and #ffffff (or another color hexcode) for names.\n`);
            }
            throw "Unencodable data type";
        }
        headers.push(typeCode)
        if (typeCode === lastTypeCode) {
            repeatTypeCount++
        } else {
            headerCodes.push(lastTypeCode)
            if (repeatTypeCount >= 1) {
                while (repeatTypeCount > 19) {
                    headerCodes.push(0b1110)
                    headerCodes.push(15)
                    repeatTypeCount -= 19
                }
                if (repeatTypeCount === 1)
                    headerCodes.push(lastTypeCode)
                else if (repeatTypeCount === 2)
                    headerCodes.push(0b1100)
                else if (repeatTypeCount === 3)
                    headerCodes.push(0b1101)
                else if (repeatTypeCount < 20) {
                    headerCodes.push(0b1110)
                    headerCodes.push(repeatTypeCount - 4)
                }
            }
            repeatTypeCount = 0
            lastTypeCode = typeCode
        }
    }
    headerCodes.push(lastTypeCode)
    if (repeatTypeCount >= 1) {
        while (repeatTypeCount > 19) {
            headerCodes.push(0b1110)
            headerCodes.push(15)
            repeatTypeCount -= 19
        }
        if (repeatTypeCount === 1)
            headerCodes.push(lastTypeCode)
        else if (repeatTypeCount === 2)
            headerCodes.push(0b1100)
        else if (repeatTypeCount === 3)
            headerCodes.push(0b1101)
        else if (repeatTypeCount < 20) {
            headerCodes.push(0b1110)
            headerCodes.push(repeatTypeCount - 4)
        }
    }
    headerCodes.push(0b1111)
    if (headerCodes.length % 2 === 1)
        headerCodes.push(0b1111)

    let output = new Uint8Array((headerCodes.length >> 1) + contentSize)
    for (let i = 0; i < headerCodes.length; i += 2) {
        let upper = headerCodes[i]
        let lower = headerCodes[i + 1]
        output[i >> 1] = (upper << 4) | lower
    }
    let index = headerCodes.length >> 1
    for (let i = 0; i < headers.length; i++) {
        let block = message[i]
        switch (headers[i]) {
            case 0b0000:
            case 0b0001:
                break
            case 0b0010:
            case 0b0011:
                output[index++] = block
            break
            case 0b0100:
            case 0b0101:
                u16[0] = block
                output.set(c16, index)
                index += 2
                break
            case 0b0110:
            case 0b0111:
                u32[0] = block
                output.set(c32, index)
                index += 4
                break
            case 0b1000:
                f32[0] = block
                output.set(c32, index)
                index += 4
                break
            case 0b1001:
                {
                    let byte = block.length === 0 ? 0 : block.charCodeAt(0)
                    output[index++] = byte
                }
                break
            case 0b1010:
                for (let i = 0; i < block.length; i++) {
                    output[index++] = block.charCodeAt(i)
                }
                output[index++] = 0
                break
            case 0b1011:
                for (let i = 0; i < block.length; i++) {
                let charCode = block.charCodeAt(i)
                    output[index++] = charCode & 0xff
                    output[index++] = charCode >> 8
                }
                output[index++] = 0
                output[index++] = 0
                break
        }
    }

    return output
}

let decode = packet => {
    let data = new Uint8Array(packet)
    if (data[0] >> 4 !== 0b1111)
    return null

    let headers = []
    let lastTypeCode = 0b1111
    let index = 0
    let consumedHalf = true
    while (true) {
        if (index >= data.length)
        return null
        let typeCode = data[index]

        if (consumedHalf) {
            typeCode &= 0b1111
            index++
        } else {
            typeCode >>= 4
        }
        consumedHalf = !consumedHalf

        if ((typeCode & 0b1100) === 0b1100) {
            if (typeCode === 0b1111) {
                if (consumedHalf)
                    index++
                    break
            }

            let repeat = typeCode - 10 // 0b1100 - 2
            if (typeCode === 0b1110) {
                if (index >= data.length)
                return null
                let repeatCode = data[index]

                if (consumedHalf) {
                    repeatCode &= 0b1111
                    index++
                } else {
                    repeatCode >>= 4
                }
                consumedHalf = !consumedHalf

                repeat += repeatCode
            }

            for (let i = 0; i < repeat; i++)
            headers.push(lastTypeCode)
        } else {
            headers.push(typeCode)
            lastTypeCode = typeCode
        }
    }

    let output = []
    for (let header of headers) {
        switch (header) {
        case 0b0000:
            output.push(0)
            break
        case 0b0001:
            output.push(1)
            break
        case 0b0010:
            output.push(data[index++])
            break
        case 0b0011:
            output.push(data[index++] - 0x100)
            break
        case 0b0100:
            c16[0] = data[index++]
            c16[1] = data[index++]
            output.push(u16[0])
            break
        case 0b0101:
            c16[0] = data[index++]
            c16[1] = data[index++]
            output.push(u16[0] - 0x10000)
            break
        case 0b0110:
            c32[0] = data[index++]
            c32[1] = data[index++]
            c32[2] = data[index++]
            c32[3] = data[index++]
            output.push(u32[0])
            break
        case 0b0111:
            c32[0] = data[index++]
            c32[1] = data[index++]
            c32[2] = data[index++]
            c32[3] = data[index++]
            output.push(u32[0] - 0x100000000)
            break
        case 0b1000:
            c32[0] = data[index++]
            c32[1] = data[index++]
            c32[2] = data[index++]
            c32[3] = data[index++]
            output.push(f32[0])
            break
        case 0b1001:
            {
                let byte = data[index++]
                output.push(byte === 0 ? '' : String.fromCharCode(byte))
            }
            break
        case 0b1010:
            {
                let string = ''
                let byte = 0
                while (byte = data[index++]) {
                    string += String.fromCharCode(byte)
                }
                output.push(string)
            }
            break
        case 0b1011:
            {
                let string = ''
                let byte = 0
                while (byte = data[index++] | (data[index++] << 8)) {
                    string += String.fromCharCode(byte)
                }
                output.push(string)
            }
            break
        }
    }

    return output
}

exports.encode = encode
exports.decode = decode
