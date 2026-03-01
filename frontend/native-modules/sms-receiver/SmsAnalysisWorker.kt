package com.silverguard.app

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Worker: call backend /predict, if probability > 85% show notification.
 */
class SmsAnalysisWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val body = inputData.getString(KEY_SMS_BODY) ?: return@withContext Result.failure()
        if (body.isBlank()) return@withContext Result.success()

        try {
            val resp = callPredict(body)
            val prob = resp.optDouble("percent", 0.0) / 100.0
            Log.d(TAG, "Predict result: prob=$prob")

            if (prob >= THRESHOLD) {
                NotificationHelper.showPhishingAlert(applicationContext, body, prob)
            }
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Predict failed", e)
            // Limit retries to avoid endless retries on persistent network failure
            if (runAttemptCount >= MAX_RETRIES) {
                Log.w(TAG, "Max retries ($MAX_RETRIES) reached, giving up")
                Result.failure()
            } else {
                Result.retry()
            }
        }
    }

    private fun callPredict(text: String): JSONObject {
        val url = URL("$BASE_URL/predict")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 15_000
        conn.readTimeout = 15_000

        conn.outputStream.use { os ->
            OutputStreamWriter(os, Charsets.UTF_8).use { w ->
                w.write(JSONObject().put("text", text).toString())
                w.flush()
            }
        }

        val code = conn.responseCode
        val body = if (code in 200..299) {
            conn.inputStream.bufferedReader().readText()
        } else {
            conn.errorStream?.bufferedReader()?.readText() ?: "{}"
        }
        conn.disconnect()

        if (code !in 200..299) {
            throw RuntimeException("Predict failed: $code $body")
        }
        return JSONObject(body)
    }

    companion object {
        const val KEY_SMS_BODY = "sms_body"

        /** Backend detector URL — synced from constants/config.ts BASE_DETECTOR_URL during prebuild */
        private const val BASE_URL = "https://q4jtmh26-8000.usw3.devtunnels.ms"
        private const val THRESHOLD = 0.70  // Match backend; notify if >= 70% phishing
        private const val MAX_RETRIES = 3
        private const val TAG = "SmsAnalysisWorker"
    }
}
