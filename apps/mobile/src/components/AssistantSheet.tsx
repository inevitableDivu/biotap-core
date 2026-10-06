import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { ContactProfile } from '@biotap/proto';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type SheetState =
  | 'IDLE'
  | 'CONNECTING'
  | 'AUTHENTICATING'
  | 'TRANSFERRING'
  | 'SUCCESS'
  | 'ERROR';

interface AssistantSheetProps {
  visible: boolean;
  state: SheetState;
  statusMessage: string;
  receivedProfile?: ContactProfile | null;
  onAuthenticate: () => void;
  onDismiss: () => void;
}

export const AssistantSheet: React.FC<AssistantSheetProps> = ({
  visible,
  state,
  statusMessage,
  receivedProfile,
  onAuthenticate,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Translucent Scrim */}
      <Animated.View
        style={[styles.scrim, { opacity }]}
        pointerEvents="auto"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onDismiss}
        />
      </Animated.View>

      {/* Floating Bottom Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>⚡</Text>
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>BioTap Contact Exchange</Text>
            <Text style={styles.subtitle}>{statusMessage}</Text>
          </View>
        </View>

        {receivedProfile && (
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>{receivedProfile.fullName}</Text>
            <Text style={styles.profileHeadline}>
              {receivedProfile.headline} • {receivedProfile.company}
            </Text>
            <Text style={styles.profileEmail}>{receivedProfile.primaryEmail}</Text>
          </View>
        )}

        <View style={styles.statusSection}>
          {state === 'AUTHENTICATING' || state === 'TRANSFERRING' ? (
            <ActivityIndicator size="small" color="#38BDF8" style={styles.spinner} />
          ) : null}

          {state === 'SUCCESS' ? (
            <Text style={styles.successBadge}>✓ Contact Verified & Saved</Text>
          ) : null}

          {state === 'ERROR' ? (
            <Text style={styles.errorBadge}>✕ Transfer Interrupted</Text>
          ) : null}
        </View>

        {state === 'CONNECTING' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAuthenticate}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Verify Biometrics to Share</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissButtonText}>
            {state === 'SUCCESS' ? 'Done' : 'Dismiss'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  profileHeadline: {
    fontSize: 13,
    color: '#38BDF8',
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  spinner: {
    marginVertical: 8,
  },
  successBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34D399',
  },
  errorBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F87171',
  },
  actionButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
  dismissButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
});
