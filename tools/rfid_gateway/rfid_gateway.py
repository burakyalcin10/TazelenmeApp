#!/usr/bin/env python3
"""RC522 RFID gateway for TazelenmeApp."""

from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import time
from dataclasses import dataclass
from typing import Iterable

import requests
import spidev


COMMAND_REG = 0x01
COM_IRQ_REG = 0x04
DIV_IRQ_REG = 0x05
ERROR_REG = 0x06
FIFO_DATA_REG = 0x09
FIFO_LEVEL_REG = 0x0A
CONTROL_REG = 0x0C
BIT_FRAMING_REG = 0x0D
MODE_REG = 0x11
TX_CONTROL_REG = 0x14
TX_ASK_REG = 0x15
T_MODE_REG = 0x2A
T_PRESCALER_REG = 0x2B
T_RELOAD_REG_H = 0x2C
T_RELOAD_REG_L = 0x2D
VERSION_REG = 0x37

PCD_IDLE = 0x00
PCD_TRANSCEIVE = 0x0C
PCD_SOFT_RESET = 0x0F

PICC_REQIDL = 0x26
PICC_ANTICOLL = 0x93

MI_OK = 0
MI_NOTAGERR = 1
MI_ERR = 2


def log(event: str, **fields: object) -> None:
    payload = {"event": event, **fields}
    print(json.dumps(payload, ensure_ascii=False), flush=True)


class MFRC522:
    def __init__(self, bus: int = 0, device: int = 0, speed_hz: int = 1_000_000) -> None:
        self.spi = spidev.SpiDev()
        self.spi.open(bus, device)
        self.spi.max_speed_hz = speed_hz
        self.spi.mode = 0
        self.init()

    def close(self) -> None:
        self.spi.close()

    def write_reg(self, addr: int, val: int) -> None:
        self.spi.xfer2([((addr << 1) & 0x7E), val & 0xFF])

    def read_reg(self, addr: int) -> int:
        return self.spi.xfer2([((addr << 1) & 0x7E) | 0x80, 0])[1]

    def set_bit_mask(self, reg: int, mask: int) -> None:
        self.write_reg(reg, self.read_reg(reg) | mask)

    def clear_bit_mask(self, reg: int, mask: int) -> None:
        self.write_reg(reg, self.read_reg(reg) & (~mask))

    def antenna_on(self) -> None:
        if not (self.read_reg(TX_CONTROL_REG) & 0x03):
            self.set_bit_mask(TX_CONTROL_REG, 0x03)

    def reset(self) -> None:
        self.write_reg(COMMAND_REG, PCD_SOFT_RESET)
        time.sleep(0.05)

    def init(self) -> None:
        self.reset()
        self.write_reg(T_MODE_REG, 0x8D)
        self.write_reg(T_PRESCALER_REG, 0x3E)
        self.write_reg(T_RELOAD_REG_L, 30)
        self.write_reg(T_RELOAD_REG_H, 0)
        self.write_reg(TX_ASK_REG, 0x40)
        self.write_reg(MODE_REG, 0x3D)
        self.antenna_on()

    def version(self) -> int:
        return self.read_reg(VERSION_REG)

    def to_card(self, command: int, send_data: Iterable[int]) -> tuple[int, list[int], int]:
        back_data: list[int] = []
        back_len = 0
        status = MI_ERR

        if command == PCD_TRANSCEIVE:
            irq_en = 0x77
            wait_irq = 0x30
        else:
            irq_en = 0x00
            wait_irq = 0x00

        self.write_reg(COM_IRQ_REG, irq_en | 0x80)
        self.clear_bit_mask(COM_IRQ_REG, 0x80)
        self.set_bit_mask(FIFO_LEVEL_REG, 0x80)
        self.write_reg(COMMAND_REG, PCD_IDLE)

        for value in send_data:
            self.write_reg(FIFO_DATA_REG, value)

        self.write_reg(COMMAND_REG, command)
        if command == PCD_TRANSCEIVE:
            self.set_bit_mask(BIT_FRAMING_REG, 0x80)

        i = 2000
        while True:
            n = self.read_reg(COM_IRQ_REG)
            i -= 1
            if not (i != 0 and not (n & 0x01) and not (n & wait_irq)):
                break

        self.clear_bit_mask(BIT_FRAMING_REG, 0x80)

        if i != 0 and not (self.read_reg(ERROR_REG) & 0x1B):
            status = MI_OK
            n = self.read_reg(FIFO_LEVEL_REG)
            last_bits = self.read_reg(CONTROL_REG) & 0x07
            if last_bits:
                back_len = (n - 1) * 8 + last_bits
            else:
                back_len = n * 8

            if n == 0:
                n = 1
            if n > 16:
                n = 16

            for _ in range(n):
                back_data.append(self.read_reg(FIFO_DATA_REG))
        else:
            status = MI_NOTAGERR

        return status, back_data, back_len

    def request(self, req_mode: int = PICC_REQIDL) -> int:
        self.write_reg(BIT_FRAMING_REG, 0x07)
        status, _back_data, back_bits = self.to_card(PCD_TRANSCEIVE, [req_mode])
        if status != MI_OK or back_bits != 0x10:
            return MI_ERR
        return MI_OK

    def anticoll(self) -> tuple[int, list[int]]:
        self.write_reg(BIT_FRAMING_REG, 0x00)
        serial = [PICC_ANTICOLL, 0x20]
        status, back_data, _back_bits = self.to_card(PCD_TRANSCEIVE, serial)
        if status == MI_OK and len(back_data) >= 5:
            checksum = 0
            for value in back_data[:4]:
                checksum ^= value
            if checksum != back_data[4]:
                return MI_ERR, []
            return MI_OK, back_data[:5]
        return MI_ERR, []

    def read_uid(self) -> str | None:
        if self.request() != MI_OK:
            return None
        status, uid = self.anticoll()
        if status != MI_OK:
            return None
        return "".join(f"{byte:02X}" for byte in uid[:4])


@dataclass(frozen=True)
class GatewayConfig:
    api_url: str
    api_key: str
    device_location: str
    debounce_seconds: float


class AttendanceGateway:
    def __init__(self, config: GatewayConfig) -> None:
        self.config = config
        self.endpoint = config.api_url.rstrip("/") + "/api/v1/attendance/scan"
        self.last_uid: str | None = None
        self.last_seen_at = 0.0

    def should_send(self, uid: str) -> bool:
        now = time.monotonic()
        if uid == self.last_uid and now - self.last_seen_at < self.config.debounce_seconds:
            return False
        self.last_uid = uid
        self.last_seen_at = now
        return True

    def send(self, uid: str) -> None:
        body = {"cardUid": uid, "deviceLocation": self.config.device_location}
        try:
            response = requests.post(
                self.endpoint,
                json=body,
                headers={"x-api-key": self.config.api_key},
                timeout=5,
            )
            try:
                payload = response.json()
            except ValueError:
                payload = {"raw": response.text[:200]}
            log("attendance_response", uid=uid, status_code=response.status_code, response=payload)
        except requests.RequestException as exc:
            log("attendance_error", uid=uid, error=str(exc))


def load_config(args: argparse.Namespace) -> GatewayConfig:
    api_url = args.api_url or os.getenv("TAZELENME_API_URL", "http://localhost:4000")
    api_key = args.api_key or os.getenv("TAZELENME_IOT_API_KEY", "")
    device_location = args.location or os.getenv("TAZELENME_DEVICE_LOCATION", "AMFI_1")
    if not args.once and not api_key:
        raise SystemExit("TAZELENME_IOT_API_KEY is required outside --once mode")
    return GatewayConfig(
        api_url=api_url,
        api_key=api_key,
        device_location=device_location,
        debounce_seconds=args.debounce_seconds,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read RC522 UIDs and post TazelenmeApp attendance scans.")
    parser.add_argument("--once", action="store_true", help="Print one UID and exit without posting.")
    parser.add_argument("--api-url", help="Backend base URL, for example http://192.168.1.109:4000")
    parser.add_argument("--api-key", help="IoT API key for x-api-key.")
    parser.add_argument("--location", help="Classroom code sent as deviceLocation.")
    parser.add_argument("--debounce-seconds", type=float, default=4.0)
    parser.add_argument("--poll-seconds", type=float, default=0.12)
    return parser.parse_args()


def main(args: argparse.Namespace, config: GatewayConfig, gateway: AttendanceGateway) -> int:
    reader = MFRC522()
    running = True

    def stop(_signum: int, _frame: object) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    version = reader.version()
    log("reader_ready", version=f"0x{version:02X}", location=config.device_location, api_url=config.api_url)

    try:
        while running:
            uid = reader.read_uid()
            if not uid:
                time.sleep(args.poll_seconds)
                continue
            if args.once:
                print(uid, flush=True)
                return 0
            if gateway.should_send(uid):
                log("card_read", uid=uid)
                gateway.send(uid)
            time.sleep(args.poll_seconds)
    finally:
        reader.close()
    return 0

if __name__ == "__main__":
    parsed_args = parse_args()
    parsed_config = load_config(parsed_args)
    parsed_gateway = AttendanceGateway(parsed_config)
    raise SystemExit(main(parsed_args, parsed_config, parsed_gateway))
