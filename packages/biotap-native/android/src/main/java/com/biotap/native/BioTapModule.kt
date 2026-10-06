package com.biotap.native

import android.nfc.NfcAdapter
import android.content.pm.PackageManager
import com.biotap.native.biometric.BiometricGatekeeper
import com.biotap.native.nfc.BioTapReaderManager
import com.biotap.native.overlay.TranslucentActivity
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import androidx.fragment.app.FragmentActivity

class BioTapModule : Module() {

    companion object {
        init {
            System.loadLibrary("biotap_native_cpp")
        }

        @JvmStatic
        external fun nativeComputeCrc32(data: ByteArray): Int

        @JvmStatic
        external fun nativeVerifyCrc32(data: ByteArray, expectedCrc: Int): Boolean
    }

    override fun definition() = ModuleDefinition {
        Name("BioTapNative")

        Events("onNfcStateChanged", "onHandshakeDetected", "onPayloadReceived")

        AsyncFunction("isHceSupported") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            val pm = context.packageManager
            pm.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)
        }

        AsyncFunction("isNfcEnabled") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            val nfcAdapter = NfcAdapter.getDefaultAdapter(context)
            nfcAdapter?.isEnabled == true
        }

        AsyncFunction("startReaderMode") {
            val activity = appContext.currentActivity ?: return@AsyncFunction
            BioTapReaderManager.enableReaderMode(activity) { state ->
                sendEvent("onNfcStateChanged", mapOf("state" to state))
            }
        }

        AsyncFunction("stopReaderMode") {
            val activity = appContext.currentActivity ?: return@AsyncFunction
            BioTapReaderManager.disableReaderMode(activity)
        }

        AsyncFunction("triggerBiometricAuth") {
            val activity = appContext.currentActivity as? FragmentActivity
                ?: return@AsyncFunction mapOf(
                    "success" to false,
                    "errorMessage" to "Current activity is not a FragmentActivity"
                )

            val gatekeeper = BiometricGatekeeper(activity)
            val cipher = gatekeeper.prepareHardwareGatedCipher()

            var authResult = mapOf<String, Any>("success" to false)
            val latch = java.util.concurrent.CountDownLatch(1)

            activity.runOnUiThread {
                gatekeeper.promptBiometric(
                    cipher = cipher,
                    onSuccess = {
                        authResult = mapOf(
                            "success" to true,
                            "authTimestamp" to System.currentTimeMillis()
                        )
                        latch.countDown()
                    },
                    onError = { code, msg ->
                        authResult = mapOf(
                            "success" to false,
                            "errorCode" to code,
                            "errorMessage" to msg.toString()
                        )
                        latch.countDown()
                    }
                )
            }

            latch.await(30, java.util.concurrent.TimeUnit.SECONDS)
            return@AsyncFunction authResult
        }

        AsyncFunction("dismissOverlay") {
            TranslucentActivity.activeInstance?.finish()
        }

        Function("computeCrc32") { data: ByteArray ->
            nativeComputeCrc32(data)
        }

        Function("verifyCrc32") { data: ByteArray, expectedCrc: Int ->
            nativeVerifyCrc32(data, expectedCrc)
        }
    }
}
