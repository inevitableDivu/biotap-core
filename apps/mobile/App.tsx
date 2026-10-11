import { BioTapHardwareManager } from '@biotap/native';
import { ContactProfile } from '@biotap/proto';
import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import { AssistantSheet } from './src/components/AssistantSheet';
import { ProfileModal } from './src/components/ProfileModal';
import { StorageService } from './src/services/StorageService';
import {
  ExchangeCoordinator,
  CoordinatorState,
  ProfileInput,
} from './src/state/ExchangeCoordinator';

export default function App() {
  const coordinator = useMemo(() => new ExchangeCoordinator(), []);
  const [coordinatorState, setCoordinatorState] = useState<CoordinatorState>({
    sheetVisible: false,
    sheetState: 'IDLE',
    statusMessage: 'Ready for hardware tap',
    receivedProfile: null,
  });

  const [myProfile, setMyProfile] = useState<ContactProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [hceAvailable, setHceAvailable] = useState<boolean>(false);
  const [nfcActive, setNfcActive] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = coordinator.subscribe(setCoordinatorState);

    // Check if user already configured their outbound profile
    StorageService.getOutboundProfile().then((profile) => {
      setMyProfile(profile);
      if (!profile) {
        // Automatically prompt user for their actual information on first launch
        setShowProfileModal(true);
      }
    });

    // Check hardware status
    BioTapHardwareManager.isHceSupported().then(setHceAvailable);
    BioTapHardwareManager.isNfcEnabled().then(setNfcActive);

    return () => unsubscribe();
  }, [coordinator]);

  const handleSaveProfile = async (input: ProfileInput) => {
    const saved = await coordinator.saveUserProfile(input);
    setMyProfile(saved);
    setShowProfileModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>BIOTAP CORE</Text>
          <Text style={styles.brandSubtitle}>High-Assurance Contact Exchange</Text>
        </View>

        {/* Hardware Status Indicators */}
        <View style={styles.statusBox}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Host Card Emulation (HCE):</Text>
            <Text
              style={[styles.statusVal, hceAvailable ? styles.activeText : styles.inactiveText]}
            >
              {hceAvailable ? 'HARDWARE ACTIVE' : 'UNAVAILABLE'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>NFC Controller Radio:</Text>
            <Text style={[styles.statusVal, nfcActive ? styles.activeText : styles.inactiveText]}>
              {nfcActive ? 'ONLINE' : 'DISABLED'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Idle Battery Signature:</Text>
            <Text style={[styles.statusVal, styles.activeText]}>0.0% (PASSIVE AID DISPATCH)</Text>
          </View>
        </View>

        {/* My Outbound Card */}
        <View style={styles.cardContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Active Outbound Business Card</Text>
            {myProfile && (
              <TouchableOpacity
                onPress={() => setShowProfileModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.editProfileLink}>Edit Card</Text>
              </TouchableOpacity>
            )}
          </View>

          {myProfile ? (
            <View style={styles.businessCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>
                    {myProfile.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editCardBadge}
                  onPress={() => setShowProfileModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editCardBadgeText}>Edit Details</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardName}>{myProfile.fullName}</Text>
              <Text style={styles.cardTitle}>{myProfile.headline}</Text>
              <Text style={styles.cardCompany}>
                {myProfile.department
                  ? `${myProfile.company} • ${myProfile.department}`
                  : myProfile.company}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.cardContact}>{myProfile.primaryEmail}</Text>
              {myProfile.primaryPhone ? (
                <Text style={styles.cardContact}>{myProfile.primaryPhone}</Text>
              ) : null}
              {myProfile.locationCity ? (
                <Text style={styles.cardLocation}>{myProfile.locationCity}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardTitle}>No Profile Configured</Text>
              <Text style={styles.emptyCardSubtitle}>
                Create your verified professional card to exchange contact details instantly over
                NFC.
              </Text>
              <TouchableOpacity
                style={styles.createCardButton}
                onPress={() => setShowProfileModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.createCardButtonText}>Set Up Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Manual Test Action for Reader Mode */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={() => coordinator.triggerBiometrics()}
            activeOpacity={0.8}
          >
            <Text style={styles.simulateButtonText}>Simulate Tap Interaction</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Outbound Profile Setup / Edit Modal */}
      <ProfileModal
        visible={showProfileModal}
        initialProfile={myProfile}
        onSave={handleSaveProfile}
        onClose={() => setShowProfileModal(false)}
        isInitialSetup={!myProfile}
      />

      {/* Assistant-Style Floating Bottom Sheet */}
      <AssistantSheet
        visible={coordinatorState.sheetVisible}
        state={coordinatorState.sheetState}
        statusMessage={coordinatorState.statusMessage}
        receivedProfile={coordinatorState.receivedProfile}
        onAuthenticate={() => coordinator.triggerBiometrics()}
        onDismiss={() => coordinator.dismiss()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginTop: 12,
    marginBottom: 28,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusBox: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statusVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeText: {
    color: '#34D399',
  },
  inactiveText: {
    color: '#F87171',
  },
  cardContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  editProfileLink: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '700',
  },
  businessCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B0F19',
  },
  editCardBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  editCardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  emptyCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createCardButton: {
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createCardButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B0F19',
  },
  cardName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  cardTitle: {
    fontSize: 14,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '600',
  },
  cardCompany: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
  },
  cardContact: {
    fontSize: 13,
    color: '#CBD5E1',
    marginVertical: 2,
  },
  cardLocation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  actionsContainer: {
    marginTop: 12,
  },
  simulateButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  simulateButtonText: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 14,
  },
});
