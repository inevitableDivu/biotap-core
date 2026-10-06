# BioTap Core: Architectural Blueprints & System Specifications

## 1. Overview & Architectural Vision

**BioTap Core** is a local-first, zero-idle-battery, tap-to-share contact exchange platform designed for high-assurance mobile environments. It allows two mobile devices (or a device and an NFC token) to execute a cryptographically verified professional profile exchange with zero foreground app overhead prior to physical interaction.

### Core Architectural Pillars

1. **Zero-Battery Idle**: The app relies entirely on native OS low-level hardware dispatch registers (OS NFC Stack, Host Card Emulation AID routing, and NDEF record filters). Zero background daemons, polling services, or location wake-locks are permitted.
2. **Hardware-Gated Biometrics**: No profile data is emitted, decrypted, or ingested without immediate, hardware-backed biometric verification (Secure Enclave / Keystore).
3. **Non-Disruptive Assistant Overlay**: Interception invokes an ephemeral, translucent window overlay rendering an interactive bottom sheet without tearing down the user's active foreground application context.
4. **Decoupled Concurrency & Offline-First Core**: NFC transceivers operate on bounded hard real-time latency budgets. All cryptographic operations, serialization/vCard parsing, and transactional storage are isolated from both the UI thread and the NFC transmission loop.

---

## 2. Documentation Directory Map

The architectural specifications are organized into focused blueprints within this directory:

| Document | Primary Focus | Key Deliverables |
| :--- | :--- | :--- |
| **[01. System Component Architecture](file:///home/inevitable/Projects/biotap-core/docs/system-component-architecture.md)** | Structural boundaries, threading model, and async pipelines. | Layered architecture (HAL, Data, Domain, Presentation), 4-tier concurrency model, reactive contracts, and language-agnostic interfaces. |
| **[02. Hardware-to-UI Lifecycle Flow](file:///home/inevitable/Projects/biotap-core/docs/hardware-to-ui-lifecycle-flow.md)** | End-to-end execution path from physical RF coupling to dismissal. | Cold-start hardware wake-up, window focus arbitration, bidirectional HCE/Reader state machines, and sequence diagrams. |
| **[03. Edge Case Matrix & Resilience Strategy](file:///home/inevitable/Projects/biotap-core/docs/edge-case-matrix-and-resilience.md)** | Failure taxonomy and fault-tolerant recovery. | Early RF decouple, biometric cancellation/lockout, lock-screen policies, storage contention, and transactional rollbacks. |
| **[04. Security & Cryptographic Architecture](file:///home/inevitable/Projects/biotap-core/docs/security-and-crypto-architecture.md)** | Trust boundary and cryptographic primitives. | Secure Enclave/KeyStore integration, ephemeral ECDH session exchange, AES-256-GCM envelope encryption, and zero-knowledge storage at rest. |
| **[05. Android & Expo Technical Stack](file:///home/inevitable/Projects/biotap-core/docs/android-expo-technical-stack.md)** | Concrete Android + Expo New Architecture implementation. | Expo Modules API + C++ TurboModule (JSI), thread topology, expo-secure-store, and project structure. |
| **[06. Android Native HCE & Biometrics](file:///home/inevitable/Projects/biotap-core/docs/android-native-hce-biometrics.md)** | Low-level Android OS APIs in Kotlin & C++. | `HostApduService`, `BiometricPrompt.CryptoObject`, Translucent Activity, and APDU chunking. |
| **[07. Protocol Buffers Wire Schema](file:///home/inevitable/Projects/biotap-core/docs/proto/biotap.proto)** | Binary wire specification and domain schemas. | Protobuf definitions for `ApduFrame`, `HandshakePayload`, and `ContactProfile`. |

---

## 3. Concrete Technology Stack Decision (Android Only)

Following the platform architecture decisions:
- **Platform Target**: **Android Exclusive (No iOS)**. Tailored specifically for Android Host Card Emulation (`HostApduService`), Android KeyStore StrongBox/TEE, and Android `BiometricPrompt`.
- **Application Framework**: **Expo SDK (Latest / SDK 52+) with React Native New Architecture** (`newArchEnabled: true`).
- **Native Extension Strategy**:
  - **Kotlin (Expo Modules API)**: OS-level NFC service binding (`HostApduService`), reader mode (`IsoDep`), hardware `BiometricPrompt.CryptoObject`, and translucent overlay window management.
  - **C++ (JSI / Cxx TurboModule)**: High-performance Protocol Buffers Lite parsing, zero-copy `jsi::ArrayBuffer` transport, CRC32 chunk validation, and microsecond ephemeral P-256 ECDH crypto.
- **Serialization Standard**: **Protocol Buffers v3 (`biotap.v1`)** for sub-millisecond serialization and compact APDU framing (≤240 bytes/frame).
- **Secure Persistence**: **`expo-secure-store`** (backed by Android KeyStore `EncryptedSharedPreferences`) for persistent tokens and database encryption keys, paired with native KeyStore-gated `CryptoObject` for real-time biometric exchange gating.

