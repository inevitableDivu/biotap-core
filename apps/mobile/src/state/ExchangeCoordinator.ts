import { BioTapHardwareManager, NfcSessionState } from '@biotap/native';
import { ContactProfile, ContactSocialHandle, ProtoCodec, ProfileVisibility } from '@biotap/proto';

import { SheetState } from '../components/AssistantSheet';
import { StorageService } from '../services/StorageService';

export interface ProfileInput {
  fullName: string;
  headline: string;
  company: string;
  department?: string;
  primaryEmail: string;
  primaryPhone?: string;
  locationCity?: string;
  github?: string;
  linkedin?: string;
  visibility?: ProfileVisibility;
}

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
   * Creates or updates the user's actual outbound contact profile
   */
  public async saveUserProfile(input: ProfileInput): Promise<ContactProfile> {
    const existing = await StorageService.getOutboundProfile();
    const now = Date.now();
    const socialHandles: ContactSocialHandle[] = [];

    if (input.github?.trim()) {
      const username = input.github.replace(/^@/, '').trim();
      socialHandles.push({
        platform: 'github',
        username,
        url: `https://github.com/${username}`,
      });
    }

    if (input.linkedin?.trim()) {
      const trimmed = input.linkedin.trim();
      const url = trimmed.startsWith('http')
        ? trimmed
        : `https://linkedin.com/in/${trimmed.replace(/^@/, '')}`;
      socialHandles.push({
        platform: 'linkedin',
        username: trimmed
          .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\/?/, '')
          .replace(/\/$/, ''),
        url,
      });
    }

    const profile: ContactProfile = {
      profileId:
        existing?.profileId || `usr_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`,
      fullName: input.fullName.trim(),
      headline: input.headline.trim(),
      company: input.company.trim(),
      department: input.department?.trim() || '',
      primaryEmail: input.primaryEmail.trim(),
      primaryPhone: input.primaryPhone?.trim() || '',
      locationCity: input.locationCity?.trim() || '',
      socialHandles,
      vcardRaw: generateVCard(input),
      visibility: input.visibility ?? ProfileVisibility.FULL_PROFESSIONAL,
      createdAtEpochMs: existing?.createdAtEpochMs || now,
      updatedAtEpochMs: now,
    };

    await StorageService.saveOutboundProfile(profile);
    return profile;
  }
}

function generateVCard(input: ProfileInput): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:4.0',
    `FN:${input.fullName.trim()}`,
    `TITLE:${input.headline.trim()}`,
    `ORG:${input.company.trim()}`,
    `EMAIL;TYPE=work:${input.primaryEmail.trim()}`,
  ];

  if (input.primaryPhone?.trim()) {
    lines.push(`TEL;TYPE=cell:${input.primaryPhone.trim()}`);
  }
  if (input.locationCity?.trim()) {
    lines.push(`ADR;TYPE=work:;;;${input.locationCity.trim()};;;`);
  }
  if (input.github?.trim()) {
    const username = input.github.replace(/^@/, '').trim();
    lines.push(`X-SOCIALPROFILE;TYPE=github:https://github.com/${username}`);
  }
  if (input.linkedin?.trim()) {
    const trimmed = input.linkedin.trim();
    const url = trimmed.startsWith('http')
      ? trimmed
      : `https://linkedin.com/in/${trimmed.replace(/^@/, '')}`;
    lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${url}`);
  }

  lines.push('END:VCARD');
  return lines.join('\n');
}
