package com.biotap.native.hce

import android.content.Intent
import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import com.biotap.native.overlay.TranslucentActivity
import java.security.SecureRandom
import java.util.concurrent.atomic.AtomicReference

interface HceSessionListener {
    fun onCommandReceived(apdu: ByteArray): ByteArray
    fun onCarrierLost()
}

class BioTapHceService : HostApduService() {

    companion object {
        // AID: F0 01 02 03 04 05
        private val SELECT_AID_APDU = byteArrayOf(
            0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte(),
            0x06.toByte(), 0xF0.toByte(), 0x01.toByte(), 0x02.toByte(), 0x03.toByte(), 0x04.toByte(), 0x05.toByte(),
            0x00.toByte()
        )

        private val SW_SUCCESS = byteArrayOf(0x90.toByte(), 0x00.toByte())
        private val SW_ERROR = byteArrayOf(0x6F.toByte(), 0x00.toByte())

        val activeListener = AtomicReference<HceSessionListener?>(null)
    }

    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
        if (commandApdu == null || commandApdu.isEmpty()) {
            return SW_ERROR
        }

        // Intercept SELECT AID to wake up application
        if (isSelectAid(commandApdu)) {
            launchTranslucentOverlay()
            return buildHandshakeResponse()
        }

        val listener = activeListener.get()
        return listener?.onCommandReceived(commandApdu) ?: SW_ERROR
    }

    override fun onDeactivated(reason: Int) {
        val listener = activeListener.get()
        listener?.onCarrierLost()
        activeListener.set(null)
    }

    private fun isSelectAid(apdu: ByteArray): Boolean {
        if (apdu.size < 11) return false
        // Header check: 00 A4 04 00 06 F0 01 02 03 04 05
        return apdu[0] == 0x00.toByte() &&
               apdu[1] == 0xA4.toByte() &&
               apdu[2] == 0x04.toByte() &&
               apdu[5] == 0xF0.toByte() &&
               apdu[6] == 0x01.toByte() &&
               apdu[7] == 0x02.toByte() &&
               apdu[8] == 0x03.toByte() &&
               apdu[9] == 0x04.toByte() &&
               apdu[10] == 0x05.toByte()
    }

    private fun launchTranslucentOverlay() {
        val intent = Intent(this, TranslucentActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
            putExtra("EXTRA_TRIGGER_SOURCE", "NFC_HCE_TAP")
        }
        startActivity(intent)
    }

    private fun buildHandshakeResponse(): ByteArray {
        val nonce = ByteArray(32).also { SecureRandom().nextBytes(it) }
        // Protocol v1 (0x01) + 32-byte Nonce + 90 00
        return byteArrayOf(0x01) + nonce + SW_SUCCESS
    }
}
