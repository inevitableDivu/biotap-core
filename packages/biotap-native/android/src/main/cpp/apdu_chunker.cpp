#include "apdu_chunker.hpp"

#include <zlib.h>

namespace biotap {

uint32_t ApduChunker::computeCrc32(const uint8_t* data, size_t length) {
    uLong crc = crc32(0L, Z_NULL, 0);
    return static_cast<uint32_t>(crc32(crc, data, static_cast<uInt>(length)));
}

bool ApduChunker::verifyChecksum(const uint8_t* data, size_t length, uint32_t expectedCrc) {
    return computeCrc32(data, length) == expectedCrc;
}

std::vector<ChunkedFrame> ApduChunker::chunkPayload(uint8_t packetType, uint32_t sessionId,
                                                    const uint8_t* data, size_t length) {
    std::vector<ChunkedFrame> frames;
    uint32_t totalChunks =
        static_cast<uint32_t>((length + MAX_APDU_PAYLOAD_SIZE - 1) / MAX_APDU_PAYLOAD_SIZE);
    if (totalChunks == 0)
        totalChunks = 1;

    for (uint32_t seq = 0; seq < totalChunks; ++seq) {
        size_t offset = seq * MAX_APDU_PAYLOAD_SIZE;
        size_t chunkLen = std::min(MAX_APDU_PAYLOAD_SIZE, length - offset);

        ChunkedFrame frame;
        frame.packetType = packetType;
        frame.sessionId = sessionId;
        frame.sequenceNumber = seq;
        frame.totalChunks = totalChunks;

        if (data != nullptr && chunkLen > 0) {
            frame.payload.assign(data + offset, data + offset + chunkLen);
            frame.crc32Checksum = computeCrc32(frame.payload.data(), frame.payload.size());
        } else {
            frame.crc32Checksum = 0;
        }

        frames.push_back(std::move(frame));
    }

    return frames;
}

} // namespace biotap
