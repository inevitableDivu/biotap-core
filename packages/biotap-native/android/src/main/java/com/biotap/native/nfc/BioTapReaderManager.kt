package com.biotap.native.nfc

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Bundle

object BioTapReaderManager {

    private val SELECT_AID_APDU = byteArrayOf(
        0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte(),
        0x06.toByte(), 0xF0.toByte(), 0x01.toByte(), 0x02.toByte(), 0x03.toByte(), 0x04.toByte(), 0x05.toByte(),
        0x00.toByte()
    )

    fun enableReaderMode(activity: Activity, onStateChange: (String) -> Unit) {
        val nfcAdapter = NfcAdapter.getDefaultAdapter(activity) ?: return

        val flags = NfcAdapter.FLAG_READER_NFC_A or
                    NfcAdapter.FLAG_READER_NFC_B or
                    NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK

        nfcAdapter.enableReaderMode(activity, { tag: Tag ->
            onStateChange("RF_FIELD_DETECTED")
            val isoDep = IsoDep.get(tag)
            if (isoDep != null) {
                try {
                    isoDep.connect()
                    isoDep.timeout = 5000 // 5 seconds to accommodate biometric gate
                    onStateChange("HANDSHAKING")

                    val response = isoDep.transceive(SELECT_AID_APDU)
                    if (response != null && response.size >= 2) {
                        onStateChange("TRANSFERRING")
                    }
                } catch (e: Exception) {
                    onStateChange("LOST_CARRIER")
                } finally {
                    try {
                        isoDep.close()
                    } catch (_: Exception) {}
                }
            }
        }, flags, Bundle())
    }

    fun disableReaderMode(activity: Activity) {
        val nfcAdapter = NfcAdapter.getDefaultAdapter(activity) ?: return
        nfcAdapter.disableReaderMode(activity)
    }
}
