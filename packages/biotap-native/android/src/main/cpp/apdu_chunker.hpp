#pragma once

#include <vector>
#include <cstdint>
#include <cstddef>
#include <algorithm>

namespace biotap {

struct ChunkedFrame {
    uint8_t packetType;
    uint32_t sessionId;
    uint32_t sequenceNumber;
    uint32_t totalChunks;
    std::vector<uint8_t> payload;
    uint32_t crc32Checksum;
};

class ApduChunker {
public:
    static constexpr size_t MAX_APDU_PAYLOAD_SIZE = 240;

    static std::vector<ChunkedFrame> chunkPayload(
        uint8_t packetType,
        uint32_t sessionId,
        const uint8_t* data,
        size_t length
    );

    static uint32_t computeCrc32(const uint8_t* data, size_t length);
    static bool verifyChecksum(const uint8_t* data, size_t length, uint32_t expectedCrc);
};

} // namespace biotap
