package com.silverguard.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.workDataOf

/**
 * Receives incoming SMS. Enqueues work for backend analysis.
 * Do NOT do network I/O here — BroadcastReceiver can be killed quickly.
 */
class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        val body = messages.joinToString("") { it.displayMessageBody ?: "" }.trim()
        if (body.isBlank()) return

        Log.d(TAG, "SMS received, length=${body.length}, enqueuing analysis")

        val inputData = workDataOf(
            SmsAnalysisWorker.KEY_SMS_BODY to body
        )

        val request = OneTimeWorkRequestBuilder<SmsAnalysisWorker>()
            .setInputData(inputData)
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .build()

        val uniqueName = "sms_${body.hashCode().toString().replace("-", "n")}"
        WorkManager.getInstance(context)
            .enqueueUniqueWork(uniqueName, ExistingWorkPolicy.KEEP, request)
    }

    companion object {
        private const val TAG = "SmsReceiver"
    }
}
