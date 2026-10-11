import { BioTapHardwareManager, NfcSessionState } from '@biotap/native';
import { ContactProfile, ProtoCodec, ProfileVisibility } from '@biotap/proto';

import { SheetState } from '../components/AssistantSheet';
import { StorageService } from '../services/StorageService';

export interface CoordinatorState {
  sheetVisible: boolean;
  sheetState: SheetState;
  statusMessage: string;
  receivedProfile: ContactProfile | null;
}

export class ExchangeCoordinator {
  private state: CoordinatorState = {
    sheetVisible: false,
    sheetState: 'IDLE',
    statusMessage: 'Ready for hardware tap',
    receivedProfile: null,
  };

  private listeners: Array<(state: CoordinatorState) => void> = [];

  constructor() {
    this.setupHardwareListeners();
  }

  public subscribe(listener: (state: CoordinatorState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private updateState(partial: Partial<CoordinatorState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private setupHardwareListeners() {
    BioTapHardwareManager.onNfcStateChanged((nfcState: NfcSessionState) => {
      this.handleNfcStateChange(nfcState);
    });

    BioTapHardwareManager.onHandshakeDetected(() => {
      this.updateState({
        sheetVisible: true,
        sheetState: 'CONNECTING',
        statusMessage: 'Peer connected. Biometric authorization required.',
      });
      // Automatically prompt biometrics to preserve flow
      this.triggerBiometrics();
    });

    BioTapHardwareManager.onPayloadReceived(async (event) => {
      try {
        const bytes = ProtoCodec.base64ToBytes(event.rawPayloadBase64);
        const profile = ProtoCodec.decodeProfile(bytes);

        await StorageService.saveReceivedProfile(profile);

        this.updateState({
          sheetState: 'SUCCESS',
          statusMessage: `Profile exchanged with ${profile.fullName}`,
          receivedProfile: profile,
        });
      } catch {
        this.updateState({
          sheetState: 'ERROR',
          statusMessage: 'Failed to decode peer profile payload',
        });
      }
    });
  }

  private handleNfcStateChange(state: NfcSessionState) {
    switch (state) {
      case 'RF_FIELD_DETECTED':
        this.updateState({
          sheetVisible: true,
          sheetState: 'CONNECTING',
          statusMessage: 'NFC Carrier detected...',
        });
        break;
      case 'HANDSHAKING':
        this.updateState({
          sheetState: 'AUTHENTICATING',
          statusMessage: 'Negotiating cryptographic handshake...',
        });
        break;
      case 'TRANSFERRING':
        this.updateState({
          sheetState: 'TRANSFERRING',
          statusMessage: 'Streaming encrypted contact profile...',
        });
        break;
      case 'LOST_CARRIER':
        if (this.state.sheetState !== 'SUCCESS') {
          this.updateState({
            sheetState: 'ERROR',
            statusMessage: 'Connection lost. Please tap devices together again.',
          });
        }
        break;
      case 'DISCONNECTED':
        break;
    }
  }

  public async triggerBiometrics() {
    this.updateState({
      sheetState: 'AUTHENTICATING',
      statusMessage: 'Scan fingerprint or Face unlock to authorize...',
    });

    const result = await BioTapHardwareManager.authenticateWithBiometrics();

    if (result.success) {
      this.updateState({
        sheetState: 'TRANSFERRING',
        statusMessage: 'Biometrics verified. Transmitting encrypted profile...',
      });
    } else {
      this.updateState({
        sheetState: 'ERROR',
        statusMessage: result.errorMessage || 'Biometric authentication was cancelled',
      });
    }
  }

  public async dismiss() {
    this.updateState({
      sheetVisible: false,
      sheetState: 'IDLE',
      statusMessage: 'Ready for hardware tap',
      receivedProfile: null,
    });
    await BioTapHardwareManager.dismissOverlay();
  }

  /**
   * Generates mock sample profile for local testing and seeding
   */
  public async seedDefaultProfile(): Promise<void> {
    const existing = await StorageService.getOutboundProfile();
    if (!existing) {
      const defaultProfile: ContactProfile = {
        profileId: 'usr_' + Math.random().toString(36).substring(2, 10),
        fullName: 'Alex Vance',
        headline: 'Principal Systems Architect',
        company: 'BioTap Core Systems',
        department: 'Infrastructure',
        primaryEmail: 'alex.vance@example.com',
        primaryPhone: '+1-555-0149',
        locationCity: 'San Francisco, CA',
        socialHandles: [
          { platform: 'github', username: 'avance', url: 'https://github.com' },
          { platform: 'linkedin', username: 'avance', url: 'https://linkedin.com' },
        ],
        vcardRaw: 'BEGIN:VCARD\nVERSION:4.0\nFN:Alex Vance\nEND:VCARD',
        visibility: ProfileVisibility.FULL_PROFESSIONAL,
        createdAtEpochMs: Date.now(),
        updatedAtEpochMs: Date.now(),
      };
      await StorageService.saveOutboundProfile(defaultProfile);
    }
  }
}
