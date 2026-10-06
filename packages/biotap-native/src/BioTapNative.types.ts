export type NfcRole = 'EMULATING_TAG' | 'POLLING_READER';

export type NfcSessionState =
  | 'DISCONNECTED'
  | 'RF_FIELD_DETECTED'
  | 'HANDSHAKING'
  | 'TRANSFERRING'
  | 'COMPLETED'
  | 'LOST_CARRIER';

export interface NativeHandshakeEvent {
  role: NfcRole;
  sessionId: number;
  peerNonceHex: string;
}

export interface NativePayloadReceivedEvent {
  sessionId: number;
  rawPayloadBase64: string;
}

export interface BiometricResult {
  success: boolean;
  errorCode?: number;
  errorMessage?: string;
  authTimestamp?: number;
}
