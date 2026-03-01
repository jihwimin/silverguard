package com.silverguard.app

import android.content.Context
import android.database.ContentObserver
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager

/**
 * Fallback for when SMS_RECEIVED broadcast is not delivered (e.g. non-default SMS app on Android 4.4+).
 * Observes the SMS ContentProvider; when the default app inserts a new message, we detect and analyze it.
 * Only active while the app process is running.
 */
class SmsContentObserver(
    private val context: Context,
    private val debounceHandler: Handler = Handler(Looper.getMainLooper())
) : ContentObserver(debounceHandler) {

    override fun onChange(selfChange: Boolean, uri: Uri?) {
        onChange(selfChange)
    }

    override fun onChange(selfChange: Boolean) {
        if (selfChange) return

        debounceHandler.postDelayed({
            processLatestInboxSms()
        }, DEBOUNCE_MS)
    }

    private fun processLatestInboxSms() {
        if (!hasReadSmsPermission()) return

        var cursor: Cursor? = null
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val lastId = prefs.getLong(KEY_LAST_PROCESSED_ID, -1L)

            val projection = arrayOf(Telephony.Sms._ID, Telephony.Sms.BODY)
            val selection = "${Telephony.Sms.TYPE} = ? AND ${Telephony.Sms._ID} > ?"
            val selectionArgs = arrayOf(
                Telephony.Sms.MESSAGE_TYPE_INBOX.toString(),
                lastId.toString()
            )

            cursor = context.contentResolver.query(
                Telephony.Sms.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                "${Telephony.Sms._ID} ASC"
            ) ?: return

            var maxProcessedId = lastId
            while (cursor.moveToNext()) {
                val id = cursor.getLong(cursor.getColumnIndexOrThrow(Telephony.Sms._ID))
                val body = cursor.getString(cursor.getColumnIndexOrThrow(Telephony.Sms.BODY))?.trim() ?: continue
                if (body.isBlank()) continue

                maxProcessedId = maxOf(maxProcessedId, id)
                Log.d(TAG, "SmsContentObserver: new inbox SMS id=$id, length=${body.length}, enqueuing analysis")

                val inputData = androidx.work.workDataOf(SmsAnalysisWorker.KEY_SMS_BODY to body)
                val request = OneTimeWorkRequestBuilder<SmsAnalysisWorker>()
                    .setInputData(inputData)
                    .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                    .build()
                val uniqueName = "sms_${body.hashCode().toString().replace("-", "n")}"
                WorkManager.getInstance(context)
                    .enqueueUniqueWork(uniqueName, ExistingWorkPolicy.KEEP, request)
            }
            if (maxProcessedId != lastId) {
                prefs.edit().putLong(KEY_LAST_PROCESSED_ID, maxProcessedId).apply()
            }
        } catch (e: Exception) {
            Log.e(TAG, "processLatestInboxSms failed", e)
        } finally {
            cursor?.close()
        }
    }

    private fun hasReadSmsPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            context.checkSelfPermission(android.Manifest.permission.READ_SMS) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    companion object {
        private const val TAG = "SmsContentObserver"
        private const val PREFS_NAME = "sms_observer"
        private const val KEY_LAST_PROCESSED_ID = "last_processed_id"
        private const val DEBOUNCE_MS = 500L
    }
}
