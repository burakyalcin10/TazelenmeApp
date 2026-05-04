# Raspberry Pi RC522 Gateway

Small gateway for the TazelenmeApp hardware demo. It reads an RFID/NFC UID from an
MFRC522/RC522 reader on Raspberry Pi SPI bus 0, chip select 0, then posts the UID
to the backend attendance scan endpoint.

Default RC522 wiring:

| RC522 | Raspberry Pi |
| --- | --- |
| SDA / SS | GPIO8 / CE0, pin 24 |
| SCK | GPIO11 / SCLK, pin 23 |
| MOSI | GPIO10 / MOSI, pin 19 |
| MISO | GPIO9 / MISO, pin 21 |
| RST | GPIO25, pin 22 |
| 3.3V | 3.3V |
| GND | GND |

Run a one-shot card read:

```bash
python3 rfid_gateway.py --once
```

Run the gateway manually:

```bash
export TAZELENME_API_URL="http://192.168.1.109:4000"
export TAZELENME_IOT_API_KEY="iot_device_secret_key_change_in_production"
export TAZELENME_DEVICE_LOCATION="AUTO"
python3 rfid_gateway.py
```

`TAZELENME_DEVICE_LOCATION=AUTO` lets the backend find the active attendance
session for the scanned student's enrolled course. Use a classroom code such as
`AMFI_1` or `SEMINER_SALONU` only when the reader must be locked to one room.

Install as a systemd service:

```bash
sudo cp tazelenme-rfid.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tazelenme-rfid
sudo journalctl -u tazelenme-rfid -f
```
