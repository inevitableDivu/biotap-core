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
import { ExchangeCoordinator, CoordinatorState } from './src/state/ExchangeCoordinator';
import { AssistantSheet } from './src/components/AssistantSheet';
import { StorageService } from './src/services/StorageService';
import { ContactProfile } from '@biotap/proto';
import { BioTapHardwareManager } from '@biotap/native';

export default function App() {
  const coordinator = useMemo(() => new ExchangeCoordinator(), []);
  const [coordinatorState, setCoordinatorState] = useState<CoordinatorState>({
    sheetVisible: false,
    sheetState: 'IDLE',
    statusMessage: 'Ready for hardware tap',
    receivedProfile: null,
  });

  const [myProfile, setMyProfile] = useState<ContactProfile | null>(null);
  const [hceAvailable, setHceAvailable] = useState<boolean>(false);
  const [nfcActive, setNfcActive] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = coordinator.subscribe(setCoordinatorState);
    
    // Seed and load profile
    coordinator.seedDefaultProfile().then(async () => {
      const profile = await StorageService.getOutboundProfile();
      setMyProfile(profile);
    });

    // Check hardware status
    BioTapHardwareManager.isHceSupported().then(setHceAvailable);
    BioTapHardwareManager.isNfcEnabled().then(setNfcActive);

    return () => unsubscribe();
  }, [coordinator]);

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
            <Text style={[styles.statusVal, hceAvailable ? styles.activeText : styles.inactiveText]}>
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
        {myProfile && (
          <View style={styles.cardContainer}>
            <Text style={styles.sectionHeading}>Active Outbound Business Card</Text>
            <View style={styles.businessCard}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{myProfile.fullName.charAt(0)}</Text>
              </View>
              <Text style={styles.cardName}>{myProfile.fullName}</Text>
              <Text style={styles.cardTitle}>{myProfile.headline}</Text>
              <Text style={styles.cardCompany}>{myProfile.company}</Text>

              <View style={styles.divider} />

              <Text style={styles.cardContact}>{myProfile.primaryEmail}</Text>
              <Text style={styles.cardContact}>{myProfile.primaryPhone}</Text>
              <Text style={styles.cardLocation}>{myProfile.locationCity}</Text>
            </View>
          </View>
        )}

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
  sectionHeading: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
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
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLetter: {
    fontSize: 22,
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
