import { NativeModulesProxy, LegacyEventEmitter, EventSubscription } from 'expo-modules-core';
import {
  NfcRole,
  NfcSessionState,
  NativeHandshakeEvent,
  NativePayloadReceivedEvent,
  BiometricResult,
} from './BioTapNative.types';

const BioTapNative = NativeModulesProxy.BioTapNative || {
  isHceSupported: async () => false,
  isNfcEnabled: async () => false,
  startReaderMode: async () => {},
  stopReaderMode: async () => {},
  triggerBiometricAuth: async (): Promise<BiometricResult> => ({
    success: false,
    errorMessage: 'Native module not initialized',
  }),
  dismissOverlay: async () => {},
  installJsi: () => false,
};

const emitter = new LegacyEventEmitter(BioTapNative as any);

export class BioTapHardwareManager {
  /**
   * Check if device hardware supports Host Card Emulation (HCE)
   */
  static async isHceSupported(): Promise<boolean> {
    return BioTapNative.isHceSupported();
  }

  /**
   * Check if device NFC is currently enabled in OS settings
   */
  static async isNfcEnabled(): Promise<boolean> {
    return BioTapNative.isNfcEnabled();
  }

  /**
   * Engage active polling reader mode to read another device or static token
   */
  static async startReaderMode(): Promise<void> {
    return BioTapNative.startReaderMode();
  }

  /**
   * Release reader mode and return to passive listening
   */
  static async stopReaderMode(): Promise<void> {
    return BioTapNative.stopReaderMode();
  }

  /**
   * Request biometric gatekeeping prompt bound to hardware KeyStore
   */
  static async authenticateWithBiometrics(): Promise<BiometricResult> {
    return BioTapNative.triggerBiometricAuth();
  }

  /**
   * Dismiss the translucent overlay assistant activity
   */
  static async dismissOverlay(): Promise<void> {
    return BioTapNative.dismissOverlay();
  }

  // Event Listeners
  static onNfcStateChanged(listener: (state: NfcSessionState) => void): EventSubscription {
    return emitter.addListener('onNfcStateChanged', listener);
  }

  static onHandshakeDetected(listener: (event: NativeHandshakeEvent) => void): EventSubscription {
    return emitter.addListener('onHandshakeDetected', listener);
  }

  static onPayloadReceived(listener: (event: NativePayloadReceivedEvent) => void): EventSubscription {
    return emitter.addListener('onPayloadReceived', listener);
  }
}

export * from './BioTapNative.types';
