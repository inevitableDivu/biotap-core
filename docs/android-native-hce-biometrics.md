# Android Native HCE, Biometrics & Overlay Architecture

## 1. Native Android Implementation Foundations

This document specifies the concrete Android system-level implementation for BioTap Core, providing production-grade code architecture patterns across Kotlin, C++, and Android OS APIs.

---

## 2. Host Card Emulation (`HostApduService`) Engine

When an external reader contacts the Android device, the Android NFC stack binds directly to `BioTapHceService` on a dedicated OS **Binder IPC Thread**.

### 2.1. APDU Protocol & Frame Format
Communication adheres to ISO/IEC 7816-4 APDU standards:

```
┌─────────┬─────────┬─────────┬─────────┬─────────┬──────────────────────┬─────────┐
│   CLA   │   INS   │   P1    │   P2    │   Lc    │      DATA FIELD      │   Le    │
│ (1 byte)│ (1 byte)│ (1 byte)│ (1 byte)│ (1 byte)│ (0 - 240 bytes max)  │ (1 byte)│
└─────────┴─────────┴─────────┴─────────┴─────────┴──────────────────────┴─────────┘
```

- **Select Applet APDU**: `00 A4 04 00 06 F0 01 02 03 04 05 00`
- **Response Success**: `90 00`
- **Response Error / Abort**: `6F 00`

### 2.2. Kotlin HCE Service Architecture

```kotlin
package com.biotap.native.hce

import android.content.Intent
import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import com.biotap.native.overlay.TranslucentActivity
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class BioTapHceService : HostApduService() {

    companion object {
        private val AID_SELECT_APDU = byteArrayOf(
            0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte(),
            0x06.toByte(), 0xF0.toByte(), 0x01.toByte(), 0x02.toByte(), 0x03.toByte(), 0x04.toByte(), 0x05.toByte()
        )
        private val SW_SUCCESS = byteArrayOf(0x90.toByte(), 0x00.toByte())
        private val SW_ERROR = byteArrayOf(0x6F.toByte(), 0x00.toByte())

        // Active session bus coordinating with UI and Crypto workers
        val sessionBus = AtomicReference<HceSessionCoordinator?>(null)
    }

    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
        if (commandApdu == null) return SW_ERROR

        // 1. Intercept SELECT AID
        if (commandApdu.contentEquals(AID_SELECT_APDU)) {
            // Wake overlay UI from dead state
            launchTranslucentOverlay()
            return initializeHandshake()
        }

        // 2. Route subsequent packet frames to C++ APDU Engine via Session Bus
        val coordinator = sessionBus.get() ?: return SW_ERROR
        return coordinator.processInboundApdu(commandApdu)
    }

    override fun onDeactivated(reason: Int) {
        val coordinator = sessionBus.get()
        when (reason) {
            DEACTIVATION_LINK_LOSS -> coordinator?.onCarrierLost()
            DEACTIVATION_DESELECTED -> coordinator?.onSessionDeselected()
        }
        sessionBus.set(null)
    }

    private fun launchTranslucentOverlay() {
        val intent = Intent(this, TranslucentActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
        }
        startActivity(intent)
    }

    private fun initializeHandshake(): ByteArray {
        // Fast-path: return protocol version (0x01) + 32-byte session nonce + 90 00
        val nonce = ByteArray(32).also { java.security.SecureRandom().nextBytes(it) }
        return byteArrayOf(0x01) + nonce + SW_SUCCESS
    }
}
```

---

## 3. Hardware-Level Biometric Gatekeeping with `CryptoObject`

To satisfy strict hardware security requirements, cryptographic keys generated in Android KeyStore require user authentication before they can be utilized:

```kotlin
package com.biotap.native.biometric

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class BiometricGatekeeper(private val activity: FragmentActivity) {

    private val KEY_ALIAS = "BioTap_Hardware_Gated_Master_Key"
    private val ANDROID_KEYSTORE = "AndroidKeyStore"

    fun prepareHardwareGatedCipher(): Cipher {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            generateHardwareGatedKey()
        }

        val secretKey = keyStore.getKey(KEY_ALIAS, null) as SecretKey
        val cipher = Cipher.getInstance("${KeyProperties.KEY_ALGORITHM_AES}/${KeyProperties.BLOCK_MODE_GCM}/${KeyProperties.ENCRYPTION_PADDING_NONE}")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        return cipher
    }

    private fun generateHardwareGatedKey() {
        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
            .setInvalidatedByBiometricEnrollment(true)
            .build()

        keyGenerator.init(spec)
        keyGenerator.generateKey()
    }

    fun promptBiometric(
        cipher: Cipher,
        onSuccess: (Cipher) -> Unit,
        onError: (errorCode: Int, errString: CharSequence) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)
        val cryptoObject = BiometricPrompt.CryptoObject(cipher)

        val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                val authenticatedCipher = result.cryptoObject?.cipher
                if (authenticatedCipher != null) {
                    onSuccess(authenticatedCipher)
                } else {
                    onError(-1, "Cipher handle was null")
                }
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                onError(errorCode, errString)
            }
        })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Verify Identity to Share")
            .setSubtitle("Confirm professional contact exchange")
            .setNegativeButtonText("Cancel")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .build()

        prompt.authenticate(promptInfo, cryptoObject)
    }
}
```

---

## 4. Translucent Assistant Overlay Window Configuration

### 4.1. Android Styles (`styles.xml`)
The translucent window mimics modern OS assistants (Google Assistant / Siri drawer) without occluding the underlying application:

```xml
<resources>
    <style name="Theme.BioTap.TranslucentOverlay" parent="Theme.AppCompat.DayNight.NoActionBar">
        <!-- Make window completely translucent -->
        <item name="android:windowIsTranslucent">true</item>
        <item name="android:windowBackground">@android:color/transparent</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowIsFloating">false</item>
        <item name="android:backgroundDimEnabled">true</item>
        <item name="android:backgroundDimAmount">0.25</item>
        <!-- Do not create recents history thumbnail -->
        <item name="android:windowExcludeFromRecents">true</item>
        <item name="android:windowAnimationStyle">@style/Animation.BioTap.BottomSheet</item>
    </style>

    <style name="Animation.BioTap.BottomSheet" parent="@android:style/Animation.Dialog">
        <item name="android:windowEnterAnimation">@anim/biotap_sheet_slide_up</item>
        <item name="android:windowExitAnimation">@anim/biotap_sheet_slide_down</item>
    </style>
</resources>
```

### 4.2. Kotlin `TranslucentActivity` Focus and Window Flags

```kotlin
package com.biotap.native.overlay

import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity

class TranslucentActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Configure window manager flags for secure floating assistant
        window.apply {
            // Position at bottom of screen
            setGravity(Gravity.BOTTOM)
            
            // Allow drawing behind system nav bars
            addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
            
            // Prevent screenshots/recording of contact data
            addFlags(WindowManager.LayoutParams.FLAG_SECURE)
            
            // Support showing over locked screen if triggered while locked
            addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        // Mount React Native RootView (or Fabric Surface) hosting AssistantSheet
        // ...
    }

    override fun finish() {
        super.finish()
        // Prevent default window exit animation jerkiness
        overridePendingTransition(0, 0)
    }
}
```

---

## 5. C++ JSI Core Engine (Zero-Copy Protobuf & APDU Chunker)

By leveraging C++ through the React Native JSI (JavaScript Interface), byte arrays from NFC APDU frames are fragmented, reassembled, and deserialized into Protocol Buffers without crossing the old JSON bridge.

### 5.1. JSI C++ APDU Chunker Implementation (`apdu_chunker.hpp`)

```cpp
#pragma once
#include <vector>
#include <cstdint>
#include <cstring>
#include <zlib.h> // Hardware-accelerated CRC32

namespace biotap {

struct ChunkedFrame {
    uint8_t packetType;
    uint32_t sessionId;
    uint32_t sequenceNumber;
    uint32_t totalChunks;
    std::vector<uint8_t> payload;
    uint32_t crc32Checksum;
};

class ApduChunker {
public:
    static constexpr size_t MAX_APDU_PAYLOAD_SIZE = 240; // Fits within 255-byte standard APDU

    static std::vector<ChunkedFrame> chunkPayload(
        uint8_t packetType,
        uint32_t sessionId,
        const uint8_t* data,
        size_t length
    ) {
        std::vector<ChunkedFrame> frames;
        uint32_t totalChunks = (length + MAX_APDU_PAYLOAD_SIZE - 1) / MAX_APDU_PAYLOAD_SIZE;
        if (totalChunks == 0) totalChunks = 1;

        for (uint32_t seq = 0; seq < totalChunks; ++seq) {
            size_t offset = seq * MAX_APDU_PAYLOAD_SIZE;
            size_t chunkLen = std::min(MAX_APDU_PAYLOAD_SIZE, length - offset);

            ChunkedFrame frame;
            frame.packetType = packetType;
            frame.sessionId = sessionId;
            frame.sequenceNumber = seq;
            frame.totalChunks = totalChunks;
            frame.payload.assign(data + offset, data + offset + chunkLen);
            
            // Compute CRC32 over payload chunk
            uLong crc = crc32(0L, Z_NULL, 0);
            frame.crc32Checksum = static_cast<uint32_t>(crc32(crc, frame.payload.data(), frame.payload.size()));

            frames.push_back(frame);
        }

        return frames;
    }

    static bool verifyChecksum(const uint8_t* data, size_t length, uint32_t expectedCrc) {
        uLong crc = crc32(0L, Z_NULL, 0);
        uint32_t computed = static_cast<uint32_t>(crc32(crc, data, length));
        return computed == expectedCrc;
    }
};

} // namespace biotap
```

### 5.2. JSI Hermes Zero-Copy Exposure (`jsi_bindings.cpp`)

```cpp
#include <jsi/jsi.h>
#include "apdu_chunker.hpp"
#include "proto/biotap.pb.h"

using namespace facebook;

void installBioTapJsiBindings(jsi::Runtime& runtime) {
    // Zero-copy deserialization: ArrayBuffer -> C++ Protobuf -> JS Object
    auto deserializeProfile = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "deserializeContactProfile"),
        1,
        [](jsi::Runtime& rt, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isObject() || !args[0].asObject(rt).isArrayBuffer(rt)) {
                throw jsi::JSError(rt, "Expected ArrayBuffer as argument");
            }

            auto arrayBuffer = args[0].asObject(rt).getArrayBuffer(rt);
            const uint8_t* dataPtr = arrayBuffer.data(rt);
            size_t size = arrayBuffer.size(rt);

            biotap::v1::ContactProfile protoProfile;
            if (!protoProfile.ParseFromArray(dataPtr, static_cast<int>(size))) {
                throw jsi::JSError(rt, "Failed to parse ContactProfile protobuf bytes");
            }

            // Convert to lightweight JS Object
            jsi::Object result(rt);
            result.setProperty(rt, "profileId", jsi::String::createFromUtf8(rt, protoProfile.profile_id()));
            result.setProperty(rt, "fullName", jsi::String::createFromUtf8(rt, protoProfile.full_name()));
            result.setProperty(rt, "headline", jsi::String::createFromUtf8(rt, protoProfile.headline()));
            result.setProperty(rt, "company", jsi::String::createFromUtf8(rt, protoProfile.company()));
            result.setProperty(rt, "primaryEmail", jsi::String::createFromUtf8(rt, protoProfile.primary_email()));
            result.setProperty(rt, "primaryPhone", jsi::String::createFromUtf8(rt, protoProfile.primary_phone()));

            return result;
        }
    );

    runtime.global().setProperty(runtime, "__bioTapDeserializeProfile", deserializeProfile);
}
```
