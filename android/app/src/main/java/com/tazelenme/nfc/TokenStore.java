package com.tazelenme.nfc;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class TokenStore {
    private static final String PREFS_NAME = "secure_session";
    private static final String KEY_ALIAS = "tazelenme_nfc_session_key";
    private static final String ACCESS_TOKEN = "access_token";
    private static final String REFRESH_TOKEN = "refresh_token";

    private final SharedPreferences preferences;

    TokenStore(Context context) {
        preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    void save(String accessToken, String refreshToken) throws Exception {
        preferences.edit()
                .putString(ACCESS_TOKEN, encrypt(accessToken))
                .putString(REFRESH_TOKEN, encrypt(refreshToken))
                .apply();
    }

    String getAccessToken() {
        return decryptSafely(preferences.getString(ACCESS_TOKEN, null));
    }

    String getRefreshToken() {
        return decryptSafely(preferences.getString(REFRESH_TOKEN, null));
    }

    boolean hasSession() {
        return getAccessToken() != null && getRefreshToken() != null;
    }

    void clear() {
        preferences.edit().clear().apply();
    }

    private String decryptSafely(String encrypted) {
        if (encrypted == null) {
            return null;
        }
        try {
            return decrypt(encrypted);
        } catch (Exception error) {
            clear();
            return null;
        }
    }

    private String encrypt(String plaintext) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
        byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)
                + ":"
                + Base64.encodeToString(ciphertext, Base64.NO_WRAP);
    }

    private String decrypt(String encoded) throws Exception {
        String[] parts = encoded.split(":", 2);
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid encrypted value");
        }
        byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
        byte[] ciphertext = Base64.decode(parts[1], Base64.NO_WRAP);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        SecretKey existing = (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        if (existing != null) {
            return existing;
        }

        KeyGenerator generator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                "AndroidKeyStore"
        );
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build());
        return generator.generateKey();
    }
}
