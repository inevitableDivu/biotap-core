import { ContactProfile } from '@biotap/proto';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ProfileInput } from '../state/ExchangeCoordinator';

interface ProfileModalProps {
  visible: boolean;
  initialProfile?: ContactProfile | null;
  onSave: (data: ProfileInput) => Promise<void>;
  onClose?: () => void;
  isInitialSetup?: boolean;
}

interface ProfileFormContentProps {
  initialProfile?: ContactProfile | null;
  onSave: (data: ProfileInput) => Promise<void>;
  onClose?: () => void;
  isInitialSetup?: boolean;
}

const ProfileFormContent: React.FC<ProfileFormContentProps> = ({
  initialProfile,
  onSave,
  onClose,
  isInitialSetup = false,
}) => {
  const [fullName, setFullName] = useState(initialProfile?.fullName ?? '');
  const [headline, setHeadline] = useState(initialProfile?.headline ?? '');
  const [company, setCompany] = useState(initialProfile?.company ?? '');
  const [department, setDepartment] = useState(initialProfile?.department ?? '');
  const [primaryEmail, setPrimaryEmail] = useState(initialProfile?.primaryEmail ?? '');
  const [primaryPhone, setPrimaryPhone] = useState(initialProfile?.primaryPhone ?? '');
  const [locationCity, setLocationCity] = useState(initialProfile?.locationCity ?? '');
  const [github, setGithub] = useState(
    () => initialProfile?.socialHandles?.find((s) => s.platform === 'github')?.username ?? '',
  );
  const [linkedin, setLinkedin] = useState(() => {
    const li = initialProfile?.socialHandles?.find((s) => s.platform === 'linkedin');
    return li?.username || li?.url || '';
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs.fullName = 'Full name is required';
    }
    if (!headline.trim()) {
      errs.headline = 'Professional title or headline is required';
    }
    if (!company.trim()) {
      errs.company = 'Company or organization is required';
    }
    if (!primaryEmail.trim()) {
      errs.primaryEmail = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(primaryEmail.trim())) {
      errs.primaryEmail = 'Enter a valid email address';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      await onSave({
        fullName,
        headline,
        company,
        department,
        primaryEmail,
        primaryPhone,
        locationCity,
        github,
        linkedin,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.modalContent}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.modalTitle}>
              {isInitialSetup ? 'Set Up Your Profile' : 'Edit Professional Card'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isInitialSetup
                ? 'Enter your details to share instantly via NFC tap.'
                : 'Update the business card exchanged with peers.'}
            </Text>
          </View>
          {!isInitialSetup && onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeIconText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scrollForm}
          contentContainerStyle={styles.scrollFormContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Full Name <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.fullName ? styles.inputError : null]}
              placeholder="e.g. Jane Doe"
              placeholderTextColor="#64748B"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
              }}
              autoCapitalize="words"
            />
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>

          {/* Headline / Title */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Professional Headline / Title <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.headline ? styles.inputError : null]}
              placeholder="e.g. Principal Systems Architect"
              placeholderTextColor="#64748B"
              value={headline}
              onChangeText={(text) => {
                setHeadline(text);
                if (errors.headline) setErrors((prev) => ({ ...prev, headline: '' }));
              }}
            />
            {errors.headline ? <Text style={styles.errorText}>{errors.headline}</Text> : null}
          </View>

          {/* Company & Department */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.fieldLabel}>
                Company <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.company ? styles.inputError : null]}
                placeholder="e.g. BioTap Core"
                placeholderTextColor="#64748B"
                value={company}
                onChangeText={(text) => {
                  setCompany(text);
                  if (errors.company) setErrors((prev) => ({ ...prev, company: '' }));
                }}
              />
              {errors.company ? <Text style={styles.errorText}>{errors.company}</Text> : null}
            </View>

            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.fieldLabel}>Department</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Engineering"
                placeholderTextColor="#64748B"
                value={department}
                onChangeText={setDepartment}
              />
            </View>
          </View>

          {/* Primary Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Email Address <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.primaryEmail ? styles.inputError : null]}
              placeholder="e.g. jane.doe@example.com"
              placeholderTextColor="#64748B"
              value={primaryEmail}
              onChangeText={(text) => {
                setPrimaryEmail(text);
                if (errors.primaryEmail) setErrors((prev) => ({ ...prev, primaryEmail: '' }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.primaryEmail ? (
              <Text style={styles.errorText}>{errors.primaryEmail}</Text>
            ) : null}
          </View>

          {/* Phone & Location */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +1-555-0199"
                placeholderTextColor="#64748B"
                value={primaryPhone}
                onChangeText={setPrimaryPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={[styles.fieldGroup, styles.halfField]}>
              <Text style={styles.fieldLabel}>City / Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. San Francisco, CA"
                placeholderTextColor="#64748B"
                value={locationCity}
                onChangeText={setLocationCity}
              />
            </View>
          </View>

          {/* Social Profiles */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>GitHub Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. octocat"
              placeholderTextColor="#64748B"
              value={github}
              onChangeText={setGithub}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>LinkedIn Username / URL</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. in/janedoe or full URL"
              placeholderTextColor="#64748B"
              value={linkedin}
              onChangeText={setLinkedin}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {!isInitialSetup && onClose && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, isInitialSetup ? styles.saveBtnFull : null]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#0F172A" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isInitialSetup ? 'Create & Activate Card' : 'Save Changes'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  initialProfile,
  onSave,
  onClose,
  isInitialSetup = false,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={isInitialSetup ? undefined : onClose}
    >
      {visible ? (
        <ProfileFormContent
          key={initialProfile?.profileId ?? (isInitialSetup ? 'new' : 'empty')}
          initialProfile={initialProfile}
          onSave={onSave}
          onClose={onClose}
          isInitialSetup={isInitialSetup}
        />
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollForm: {
    flexGrow: 0,
    marginBottom: 16,
  },
  scrollFormContent: {
    paddingBottom: 12,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  rowFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfField: {
    flex: 0.48,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requiredAsterisk: {
    color: '#38BDF8',
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputError: {
    borderColor: '#F87171',
  },
  errorText: {
    fontSize: 11,
    color: '#F87171',
    marginTop: 4,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelBtn: {
    flex: 0.35,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 0.65,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
  },
  saveBtnFull: {
    flex: 1,
  },
  saveBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
});
