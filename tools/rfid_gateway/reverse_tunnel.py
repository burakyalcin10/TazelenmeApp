#!/usr/bin/env python3
"""Reverse SSH tunnel helper for local hardware demos."""

from __future__ import annotations

import argparse
import select
import socket
import threading
import time

import paramiko


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Expose a local TCP port on a remote SSH host.")
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--remote-host", default="127.0.0.1")
    parser.add_argument("--remote-port", type=int, required=True)
    parser.add_argument("--local-host", default="127.0.0.1")
    parser.add_argument("--local-port", type=int, required=True)
    return parser.parse_args()


def pipe(src, dst) -> None:
    try:
        while True:
            readable, _, _ = select.select([src], [], [], 1.0)
            if not readable:
                continue
            data = src.recv(16384)
            if not data:
                break
            dst.sendall(data)
    except OSError:
        pass
    finally:
        for stream in (src, dst):
            try:
                stream.close()
            except OSError:
                pass


def handle_channel(channel, local_host: str, local_port: int) -> None:
    try:
        local = socket.create_connection((local_host, local_port), timeout=5)
    except OSError:
        channel.close()
        return

    threading.Thread(target=pipe, args=(channel, local), daemon=True).start()
    threading.Thread(target=pipe, args=(local, channel), daemon=True).start()


def main() -> int:
    args = parse_args()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=args.host,
        username=args.user,
        password=args.password,
        look_for_keys=False,
        allow_agent=False,
        timeout=15,
    )

    transport = client.get_transport()
    if transport is None:
        raise SystemExit("SSH transport was not opened")

    transport.set_keepalive(30)
    transport.request_port_forward(args.remote_host, args.remote_port)
    print(
        f"remote {args.remote_host}:{args.remote_port} -> "
        f"local {args.local_host}:{args.local_port}",
        flush=True,
    )

    try:
        while transport.is_active():
            channel = transport.accept(5)
            if channel is None:
                time.sleep(0.1)
                continue
            threading.Thread(
                target=handle_channel,
                args=(channel, args.local_host, args.local_port),
                daemon=True,
            ).start()
    finally:
        client.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
