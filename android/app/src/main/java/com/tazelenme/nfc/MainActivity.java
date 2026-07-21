package com.tazelenme.nfc;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.IOException;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity implements NfcAdapter.ReaderCallback {
    private static final String DEFAULT_API_URL = "https://tazelenme-backend.onrender.com";
    private static final long SAME_CARD_DEBOUNCE_MS = 4_000L;

    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private final Object debounceLock = new Object();

    private LinearLayout loginPanel;
    private LinearLayout scannerPanel;
    private EditText apiUrlInput;
    private EditText tcNoInput;
    private EditText pinInput;
    private Button loginButton;
    private Button logoutButton;
    private Button openNfcSettingsButton;
    private TextView nfcStateText;
    private TextView lastUidText;
    private TextView resultText;
    private TextView globalMessageText;

    private NfcAdapter nfcAdapter;
    private TokenStore tokenStore;
    private SharedPreferences appPreferences;
    private boolean authenticated;
    private boolean readerEnabled;
    private String lastUid;
    private long lastUidAt;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        bindViews();
        tokenStore = new TokenStore(this);
        appPreferences = getSharedPreferences("app_settings", MODE_PRIVATE);
        nfcAdapter = NfcAdapter.getDefaultAdapter(this);

        apiUrlInput.setText(appPreferences.getString("api_url", DEFAULT_API_URL));
        loginButton.setOnClickListener(view -> login());
        logoutButton.setOnClickListener(view -> logout());
        openNfcSettingsButton.setOnClickListener(view ->
                startActivity(new Intent(Settings.ACTION_NFC_SETTINGS)));

        authenticated = tokenStore.hasSession();
        showAuthenticatedState(authenticated);
        updateNfcState();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateNfcState();
        enableReaderIfPossible();
    }

    @Override
    protected void onPause() {
        disableReader();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        networkExecutor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onTagDiscovered(Tag tag) {
        byte[] id = tag.getId();
        if (id == null || id.length == 0) {
            runOnUiThread(() -> showScanError("Kart UID bilgisi okunamadı."));
            return;
        }

        String uid = toHex(id);
        long now = SystemClock.elapsedRealtime();
        synchronized (debounceLock) {
            if (uid.equals(lastUid) && now - lastUidAt < SAME_CARD_DEBOUNCE_MS) {
                return;
            }
            lastUid = uid;
            lastUidAt = now;
        }

        runOnUiThread(() -> {
            lastUidText.setText(getString(R.string.card_uid_format, uid));
            resultText.setTextColor(Color.DKGRAY);
            resultText.setText(R.string.card_sending);
        });
        networkExecutor.execute(() -> submitScan(uid));
    }

    private void bindViews() {
        loginPanel = findViewById(R.id.loginPanel);
        scannerPanel = findViewById(R.id.scannerPanel);
        apiUrlInput = findViewById(R.id.apiUrlInput);
        tcNoInput = findViewById(R.id.tcNoInput);
        pinInput = findViewById(R.id.pinInput);
        loginButton = findViewById(R.id.loginButton);
        logoutButton = findViewById(R.id.logoutButton);
        openNfcSettingsButton = findViewById(R.id.openNfcSettingsButton);
        nfcStateText = findViewById(R.id.nfcStateText);
        lastUidText = findViewById(R.id.lastUidText);
        resultText = findViewById(R.id.resultText);
        globalMessageText = findViewById(R.id.globalMessageText);
    }

    private void login() {
        String apiUrl = normalizeApiUrl(apiUrlInput.getText().toString());
        String tcNo = tcNoInput.getText().toString().trim();
        String pin = pinInput.getText().toString();

        String validationError = validateLogin(apiUrl, tcNo, pin);
        if (validationError != null) {
            globalMessageText.setText(validationError);
            return;
        }

        hideKeyboard();
        globalMessageText.setText(R.string.logging_in);
        loginButton.setEnabled(false);
        networkExecutor.execute(() -> {
            try {
                ApiClient.Session session = new ApiClient(apiUrl).login(tcNo, pin);
                if (!"ADMIN".equals(session.role)) {
                    throw new ApiClient.ApiException(
                            "NFC okuyucuya yalnız koordinatör hesabı ile giriş yapılabilir.",
                            403
                    );
                }
                tokenStore.save(session.accessToken, session.refreshToken);
                appPreferences.edit().putString("api_url", apiUrl).apply();
                runOnUiThread(() -> {
                    authenticated = true;
                    pinInput.setText("");
                    globalMessageText.setText("");
                    showAuthenticatedState(true);
                    resultText.setText(getString(R.string.welcome_reader_ready, session.displayName));
                    updateNfcState();
                    enableReaderIfPossible();
                });
            } catch (Exception error) {
                runOnUiThread(() -> globalMessageText.setText(messageFor(error)));
            } finally {
                runOnUiThread(() -> loginButton.setEnabled(true));
            }
        });
    }

    private void submitScan(String uid) {
        String apiUrl = appPreferences.getString("api_url", DEFAULT_API_URL);
        String accessToken = tokenStore.getAccessToken();
        String refreshToken = tokenStore.getRefreshToken();
        if (accessToken == null || refreshToken == null) {
            runOnUiThread(this::expireSession);
            return;
        }

        ApiClient api = new ApiClient(apiUrl);
        try {
            ApiClient.ScanResult scanResult;
            try {
                scanResult = api.scan(accessToken, uid);
            } catch (ApiClient.ApiException error) {
                if (error.statusCode != 401) {
                    throw error;
                }
                ApiClient.Tokens tokens = api.refresh(refreshToken);
                tokenStore.save(tokens.accessToken, tokens.refreshToken);
                scanResult = api.scan(tokens.accessToken, uid);
            }

            ApiClient.ScanResult finalResult = scanResult;
            runOnUiThread(() -> {
                resultText.setTextColor(getColor(R.color.success));
                resultText.setText(finalResult.message);
            });
        } catch (ApiClient.ApiException error) {
            if (error.statusCode == 401 || error.statusCode == 403
                    && error.getMessage() != null
                    && error.getMessage().contains("token")) {
                runOnUiThread(this::expireSession);
            } else {
                runOnUiThread(() -> showScanError(messageFor(error)));
            }
        } catch (Exception error) {
            runOnUiThread(() -> showScanError(messageFor(error)));
        }
    }

    private void logout() {
        disableReader();
        tokenStore.clear();
        authenticated = false;
        lastUid = null;
        showAuthenticatedState(false);
        globalMessageText.setText(R.string.logged_out);
    }

    private void expireSession() {
        disableReader();
        tokenStore.clear();
        authenticated = false;
        showAuthenticatedState(false);
        globalMessageText.setText(R.string.session_expired);
    }

    private void showAuthenticatedState(boolean isAuthenticated) {
        loginPanel.setVisibility(isAuthenticated ? View.GONE : View.VISIBLE);
        scannerPanel.setVisibility(isAuthenticated ? View.VISIBLE : View.GONE);
    }

    private void updateNfcState() {
        if (!authenticated) {
            return;
        }
        if (nfcAdapter == null) {
            nfcStateText.setText(R.string.nfc_not_available);
            openNfcSettingsButton.setVisibility(View.GONE);
            return;
        }
        if (!nfcAdapter.isEnabled()) {
            nfcStateText.setText(R.string.nfc_off);
            openNfcSettingsButton.setVisibility(View.VISIBLE);
            return;
        }
        nfcStateText.setText(R.string.nfc_reader_ready);
        openNfcSettingsButton.setVisibility(View.GONE);
    }

    private void enableReaderIfPossible() {
        if (!authenticated || nfcAdapter == null || !nfcAdapter.isEnabled() || readerEnabled) {
            return;
        }
        int flags = NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK;
        nfcAdapter.enableReaderMode(this, this, flags, null);
        readerEnabled = true;
    }

    private void disableReader() {
        if (nfcAdapter != null && readerEnabled) {
            nfcAdapter.disableReaderMode(this);
            readerEnabled = false;
        }
    }

    private void showScanError(String message) {
        resultText.setTextColor(getColor(R.color.error));
        resultText.setText(message);
    }

    private String validateLogin(String apiUrl, String tcNo, String pin) {
        Uri uri = Uri.parse(apiUrl);
        if (uri.getHost() == null || uri.getScheme() == null) {
            return "Geçerli bir backend adresi girin.";
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) && !BuildConfig.DEBUG) {
            return "Yayın sürümünde backend adresi HTTPS olmalıdır.";
        }
        if (tcNo.length() != 11) {
            return "TC Kimlik No 11 haneli olmalıdır.";
        }
        if (pin.isEmpty()) {
            return "PIN zorunludur.";
        }
        return null;
    }

    private static String normalizeApiUrl(String value) {
        String result = value.trim();
        while (result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }

    private static String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            result.append(String.format(Locale.ROOT, "%02X", value & 0xFF));
        }
        return result.toString();
    }

    private static String messageFor(Exception error) {
        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) {
            return "Beklenmeyen bir hata oluştu.";
        }
        if (error instanceof java.net.SocketTimeoutException) {
            return "Sunucu zaman aşımına uğradı. İnternet bağlantısını kontrol edin.";
        }
        if (error instanceof IOException) {
            return "Sunucuya ulaşılamadı. Backend adresini ve bağlantıyı kontrol edin.";
        }
        return message;
    }

    private void hideKeyboard() {
        InputMethodManager manager = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        View focused = getCurrentFocus();
        if (manager != null && focused != null) {
            manager.hideSoftInputFromWindow(focused.getWindowToken(), 0);
        }
    }
}
