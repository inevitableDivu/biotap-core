import protobuf from 'protobufjs';

export enum PacketType {
  PACKET_TYPE_UNSPECIFIED = 0,
  HANDSHAKE_INIT = 1,
  HANDSHAKE_ACK = 2,
  KEEP_ALIVE_WTX = 3,
  PAYLOAD_CHUNK = 4,
  TRANSFER_COMPLETE = 5,
  SESSION_ABORT = 6,
}

export interface ApduFrame {
  type: PacketType;
  sessionId: number;
  sequenceNumber: number;
  totalChunks: number;
  payloadBytes: Uint8Array;
  crc32Checksum: number;
}

export interface HandshakePayload {
  protocolVersion: number;
  ephemeralPubkey: Uint8Array;
  sessionNonce: Uint8Array;
  timestampEpochMs: number | bigint;
}

export interface EncryptedProfileEnvelope {
  initializationVector: Uint8Array;
  ciphertext: Uint8Array;
  authenticationTag: Uint8Array;
  senderKeyFingerprint: string;
}

export enum ProfileVisibility {
  VISIBILITY_UNSPECIFIED = 0,
  FULL_PROFESSIONAL = 1,
  LIMITED_NETWORKING = 2,
  MINIMAL = 3,
}

export interface ContactSocialHandle {
  platform: string;
  username: string;
  url: string;
}

export interface ContactProfile {
  profileId: string;
  fullName: string;
  headline: string;
  company: string;
  department: string;
  primaryEmail: string;
  primaryPhone: string;
  locationCity: string;
  avatarThumbnailBytes?: Uint8Array;
  socialHandles: ContactSocialHandle[];
  vcardRaw: string;
  visibility: ProfileVisibility;
  createdAtEpochMs: number | bigint;
  updatedAtEpochMs: number | bigint;
  identitySignature?: Uint8Array;
}

// Protobuf schema JSON root for zero-file-loading runtime execution in Hermes
export const rootProto = protobuf.Root.fromJSON({
  nested: {
    biotap: {
      nested: {
        v1: {
          nested: {
            PacketType: {
              values: {
                PACKET_TYPE_UNSPECIFIED: 0,
                HANDSHAKE_INIT: 1,
                HANDSHAKE_ACK: 2,
                KEEP_ALIVE_WTX: 3,
                PAYLOAD_CHUNK: 4,
                TRANSFER_COMPLETE: 5,
                SESSION_ABORT: 6,
              },
            },
            ApduFrame: {
              fields: {
                type: { type: 'PacketType', id: 1 },
                sessionId: { type: 'uint32', id: 2 },
                sequenceNumber: { type: 'uint32', id: 3 },
                totalChunks: { type: 'uint32', id: 4 },
                payloadBytes: { type: 'bytes', id: 5 },
                crc32Checksum: { type: 'uint32', id: 6 },
              },
            },
            HandshakePayload: {
              fields: {
                protocolVersion: { type: 'uint32', id: 1 },
                ephemeralPubkey: { type: 'bytes', id: 2 },
                sessionNonce: { type: 'bytes', id: 3 },
                timestampEpochMs: { type: 'int64', id: 4 },
              },
            },
            EncryptedProfileEnvelope: {
              fields: {
                initializationVector: { type: 'bytes', id: 1 },
                ciphertext: { type: 'bytes', id: 2 },
                authenticationTag: { type: 'bytes', id: 3 },
                senderKeyFingerprint: { type: 'string', id: 4 },
              },
            },
            ProfileVisibility: {
              values: {
                VISIBILITY_UNSPECIFIED: 0,
                FULL_PROFESSIONAL: 1,
                LIMITED_NETWORKING: 2,
                MINIMAL: 3,
              },
            },
            ContactSocialHandle: {
              fields: {
                platform: { type: 'string', id: 1 },
                username: { type: 'string', id: 2 },
                url: { type: 'string', id: 3 },
              },
            },
            ContactProfile: {
              fields: {
                profileId: { type: 'string', id: 1 },
                fullName: { type: 'string', id: 2 },
                headline: { type: 'string', id: 3 },
                company: { type: 'string', id: 4 },
                department: { type: 'string', id: 5 },
                primaryEmail: { type: 'string', id: 6 },
                primaryPhone: { type: 'string', id: 7 },
                locationCity: { type: 'string', id: 8 },
                avatarThumbnailBytes: { type: 'bytes', id: 9 },
                socialHandles: { rule: 'repeated', type: 'ContactSocialHandle', id: 10 },
                vcardRaw: { type: 'string', id: 11 },
                visibility: { type: 'ProfileVisibility', id: 12 },
                createdAtEpochMs: { type: 'int64', id: 13 },
                updatedAtEpochMs: { type: 'int64', id: 14 },
                identitySignature: { type: 'bytes', id: 15 },
              },
            },
          },
        },
      },
    },
  },
});

const ApduFrameType = rootProto.lookupType('biotap.v1.ApduFrame');
const HandshakePayloadType = rootProto.lookupType('biotap.v1.HandshakePayload');
const ContactProfileType = rootProto.lookupType('biotap.v1.ContactProfile');
const EncryptedProfileEnvelopeType = rootProto.lookupType('biotap.v1.EncryptedProfileEnvelope');

export const ProtoCodec = {
  encodeApduFrame(frame: ApduFrame): Uint8Array {
    return ApduFrameType.encode(frame).finish();
  },
  decodeApduFrame(bytes: Uint8Array): ApduFrame {
    return ApduFrameType.decode(bytes) as unknown as ApduFrame;
  },

  encodeHandshake(handshake: HandshakePayload): Uint8Array {
    return HandshakePayloadType.encode(handshake).finish();
  },
  decodeHandshake(bytes: Uint8Array): HandshakePayload {
    return HandshakePayloadType.decode(bytes) as unknown as HandshakePayload;
  },

  encodeProfile(profile: ContactProfile): Uint8Array {
    return ContactProfileType.encode(profile).finish();
  },
  decodeProfile(bytes: Uint8Array): ContactProfile {
    return ContactProfileType.decode(bytes) as unknown as ContactProfile;
  },

  encodeEnvelope(envelope: EncryptedProfileEnvelope): Uint8Array {
    return EncryptedProfileEnvelopeType.encode(envelope).finish();
  },
  decodeEnvelope(bytes: Uint8Array): EncryptedProfileEnvelope {
    return EncryptedProfileEnvelopeType.decode(bytes) as unknown as EncryptedProfileEnvelope;
  },

  bytesToBase64(bytes: Uint8Array): string {
    return protobuf.util.base64.encode(bytes, 0, bytes.length);
  },
  base64ToBytes(base64: string): Uint8Array {
    const buffer = new Uint8Array(protobuf.util.base64.length(base64));
    protobuf.util.base64.decode(base64, buffer, 0);
    return buffer;
  },
};
