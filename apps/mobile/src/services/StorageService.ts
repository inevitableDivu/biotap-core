import * as SecureStore from 'expo-secure-store';
import { ContactProfile, ProtoCodec } from '@biotap/proto';

const PROFILE_KEY = 'biotap_user_profile_protobuf';
const ENCRYPTION_SALT_KEY = 'biotap_master_salt';
const RECEIVED_PROFILES_PREFIX = 'biotap_received_';

export const StorageService = {
  /**
   * Persists active user outbound contact profile securely using expo-secure-store
   */
  async saveOutboundProfile(profile: ContactProfile): Promise<void> {
    const encodedBytes = ProtoCodec.encodeProfile(profile);
    const base64Data = ProtoCodec.bytesToBase64(encodedBytes);
    await SecureStore.setItemAsync(PROFILE_KEY, base64Data, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },

  /**
   * Retrieves active outbound contact profile from secure storage
   */
  async getOutboundProfile(): Promise<ContactProfile | null> {
    const base64Data = await SecureStore.getItemAsync(PROFILE_KEY);
    if (!base64Data) return null;

    try {
      const uint8 = ProtoCodec.base64ToBytes(base64Data);
      return ProtoCodec.decodeProfile(uint8);
    } catch (e) {
      console.error('Failed to decode stored profile protobuf', e);
      return null;
    }
  },

  /**
   * Commits a newly received peer profile into secure storage
   */
  async saveReceivedProfile(profile: ContactProfile): Promise<void> {
    const encodedBytes = ProtoCodec.encodeProfile(profile);
    const base64Data = ProtoCodec.bytesToBase64(encodedBytes);
    const storageKey = `${RECEIVED_PROFILES_PREFIX}${profile.profileId}`;

    await SecureStore.setItemAsync(storageKey, base64Data, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },

  /**
   * Returns hardware master key salt, generating one if not present
   */
  async getOrGenerateMasterSalt(): Promise<string> {
    let salt = await SecureStore.getItemAsync(ENCRYPTION_SALT_KEY);
    if (!salt) {
      salt = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await SecureStore.setItemAsync(ENCRYPTION_SALT_KEY, salt);
    }
    return salt;
  },
};
