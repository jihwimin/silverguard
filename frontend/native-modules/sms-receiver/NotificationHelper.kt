package com.silverguard.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object NotificationHelper {

    private const val CHANNEL_ID = "silverguard_phishing"
    private const val CHANNEL_NAME = "Phishing Alerts"
    private const val NOTIFICATION_ID = 1001

    /** Deep link to diagnosis tab (with tabs visible) with SMS text and pre-computed percent. */
    private fun buildPhishingDeepLink(smsText: String, percent: Int): Uri {
        return Uri.parse("silverguard://app/(tabs)/diagnosis")
            .buildUpon()
            .appendQueryParameter("text", smsText.take(MAX_SMS_IN_URL))
            .appendQueryParameter("percent", percent.toString())
            .build()
    }

    fun showPhishingAlert(context: Context, smsPreview: String, probability: Double) {
        ensureChannel(context)

        val percent = (probability * 100).toInt()

        // Cooldown: skip if we showed a notification for this body in the last 60 seconds
        val bodyKey = smsPreview.take(200).hashCode().toString()
        val prefs = context.getSharedPreferences(PREFS_NOTIFY, Context.MODE_PRIVATE)
        val lastKey = prefs.getString(KEY_LAST_BODY, null)
        val lastTime = prefs.getLong(KEY_LAST_TIME, 0L)
        if (bodyKey == lastKey && (System.currentTimeMillis() - lastTime) < COOLDOWN_MS) {
            return
        }
        prefs.edit().putString(KEY_LAST_BODY, bodyKey).putLong(KEY_LAST_TIME, System.currentTimeMillis()).apply()
        val title = "⚠️ Possible phishing detected ($percent%)"
        val text = smsPreview.take(100).ifBlank { "Suspicious message content" }

        val deepLink = buildPhishingDeepLink(smsPreview, percent)
        val intent = Intent(Intent.ACTION_VIEW, deepLink).apply {
            setPackage(context.packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(Notification.CATEGORY_ALARM)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .build()

        try {
            val nm = NotificationManagerCompat.from(context)
            nm.cancel(NOTIFICATION_ID)
            nm.notify(NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            // POST_NOTIFICATIONS not granted on API 33+
        }
    }

    private const val MAX_SMS_IN_URL = 800
    private const val PREFS_NOTIFY = "phishing_notify"
    private const val KEY_LAST_BODY = "last_body"
    private const val KEY_LAST_TIME = "last_time"
    private const val COOLDOWN_MS = 60_000L

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts when SilverGuard detects possible phishing in SMS"
                enableVibration(true)
            }
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }
}
