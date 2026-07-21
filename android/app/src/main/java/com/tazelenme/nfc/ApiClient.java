package com.tazelenme.nfc;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class ApiClient {
    private final String baseUrl;

    ApiClient(String baseUrl) {
        this.baseUrl = baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length() - 1)
                : baseUrl;
    }

    Session login(String tcNo, String pin) throws IOException, ApiException, JSONException {
        JSONObject body = new JSONObject()
                .put("tcNo", tcNo)
                .put("pin", pin);
        JSONObject data = request("POST", "/api/v1/auth/login", body, null)
                .getJSONObject("data");
        JSONObject user = data.getJSONObject("user");
        return new Session(
                data.getString("accessToken"),
                data.getString("refreshToken"),
                user.getString("role"),
                user.optString("firstName") + " " + user.optString("lastName")
        );
    }

    Tokens refresh(String refreshToken) throws IOException, ApiException, JSONException {
        JSONObject body = new JSONObject().put("refreshToken", refreshToken);
        JSONObject data = request("POST", "/api/v1/auth/refresh", body, null)
                .getJSONObject("data");
        return new Tokens(data.getString("accessToken"), data.getString("refreshToken"));
    }

    ScanResult scan(String accessToken, String cardUid) throws IOException, ApiException, JSONException {
        JSONObject body = new JSONObject()
                .put("cardUid", cardUid)
                .put("deviceLocation", "AUTO");
        JSONObject payload = request(
                "POST",
                "/api/v1/attendance/mobile-scan",
                body,
                accessToken
        );
        JSONObject data = payload.optJSONObject("data");
        String detail = payload.optString("message", "Yoklama kaydedildi.");
        if (data != null) {
            String student = data.optString("studentName");
            String course = data.optString("courseName");
            if (!student.isEmpty() || !course.isEmpty()) {
                detail = student + (course.isEmpty() ? "" : "\n" + course);
            }
            if (data.optBoolean("alreadyRecorded", false)) {
                detail += "\nBu kartın yoklaması daha önce alınmış.";
            } else {
                detail += "\nYoklama başarıyla kaydedildi.";
            }
        }
        return new ScanResult(detail);
    }

    private JSONObject request(
            String method,
            String path,
            JSONObject body,
            String bearerToken
    ) throws IOException, ApiException {
        HttpURLConnection connection = (HttpURLConnection) new URL(baseUrl + path).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(10_000);
        connection.setReadTimeout(25_000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.setRequestProperty("User-Agent", "TazelenmeNfc-Android/0.1.0");
        if (bearerToken != null && !bearerToken.isEmpty()) {
            connection.setRequestProperty("Authorization", "Bearer " + bearerToken);
        }

        if (body != null) {
            byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
            connection.setDoOutput(true);
            connection.setFixedLengthStreamingMode(bytes.length);
            connection.getOutputStream().write(bytes);
        }

        int statusCode = connection.getResponseCode();
        InputStream stream = statusCode >= 200 && statusCode < 300
                ? connection.getInputStream()
                : connection.getErrorStream();
        String responseText = readAll(stream);
        connection.disconnect();

        JSONObject payload;
        try {
            payload = responseText.isEmpty() ? new JSONObject() : new JSONObject(responseText);
        } catch (Exception parseError) {
            throw new ApiException("Sunucudan geçersiz yanıt alındı.", statusCode);
        }

        if (statusCode < 200 || statusCode >= 300 || !payload.optBoolean("success", true)) {
            throw new ApiException(
                    payload.optString("error", "İstek başarısız oldu."),
                    statusCode
            );
        }
        return payload;
    }

    private static String readAll(InputStream inputStream) throws IOException {
        if (inputStream == null) {
            return "";
        }
        StringBuilder result = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                result.append(line);
            }
        }
        return result.toString();
    }

    static final class Session {
        final String accessToken;
        final String refreshToken;
        final String role;
        final String displayName;

        Session(String accessToken, String refreshToken, String role, String displayName) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.role = role;
            this.displayName = displayName.trim();
        }
    }

    static final class Tokens {
        final String accessToken;
        final String refreshToken;

        Tokens(String accessToken, String refreshToken) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
        }
    }

    static final class ScanResult {
        final String message;

        ScanResult(String message) {
            this.message = message;
        }
    }

    static final class ApiException extends Exception {
        final int statusCode;

        ApiException(String message, int statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    }
}
