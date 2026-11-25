# This file is part of the OneKey Python library, derived from the Trezor project.
#
# Copyright (C) SatoshiLabs and contributors
# Modifications Copyright (C) OneKey
# Modifications Copyright (C) OneKey
#
# This library is free software: you can redistribute it and/or modify
# it under the terms of the GNU Lesser General Public License version 3
# as published by the Free Software Foundation.

from __future__ import annotations

from dataclasses import dataclass
from typing import Collection, Tuple

from . import mapping, messages

UsbId = Tuple[int, int]

VENDORS = ("onekey.so", "onekey.com", "trezor.io")


@dataclass(eq=True, frozen=True)
class OneKeyModel:
    name: str
    internal_name: str
    minimum_version: tuple[int, int, int]
    vendors: Collection[str]
    usb_ids: Collection[UsbId]
    default_mapping: mapping.ProtobufMapping
    protocol_version: int = 1
    is_unknown: bool = False


# Compatibility alias for onekeylib-style callers

# ==== OneKey USB IDs ====

# Protocol V1 (Classic, Classic 1S, Mini, Touch, Pro)
USBID_ONEKEY_V1_LEGACY = (0x534C, 0x0001)
USBID_ONEKEY_V1_CORE = (0x1209, 0x53C1)
USBID_ONEKEY_V1_CORE_BOOTLOADER = (0x1209, 0x53C0)
USBID_ONEKEY_V1_APP = (0x1209, 0x4F4B)
USBID_ONEKEY_V1_BOOTLOADER = (0x1209, 0x4F4A)

# Protocol V2 (Pro 2, Neo)
USBID_ONEKEY_V2_APP = (0x1209, 0x4F4C)

V1_USB_IDS = (
    USBID_ONEKEY_V1_CORE,
    USBID_ONEKEY_V1_CORE_BOOTLOADER,
    USBID_ONEKEY_V1_APP,
    USBID_ONEKEY_V1_BOOTLOADER,
    USBID_ONEKEY_V1_LEGACY,
)

# ==== OneKey Device Models ====

CLASSIC = OneKeyModel(
    name="OneKey Classic",
    internal_name="Classic",
    minimum_version=(2, 0, 0),
    vendors=VENDORS,
    usb_ids=V1_USB_IDS,
    default_mapping=mapping.DEFAULT_MAPPING,
    protocol_version=1,
)

CLASSIC_1S = OneKeyModel(
    name="OneKey Classic 1S",
    internal_name="Classic1S",
    minimum_version=(3, 0, 0),
    vendors=VENDORS,
    usb_ids=V1_USB_IDS,
    default_mapping=mapping.DEFAULT_MAPPING,
    protocol_version=1,
)

MINI = OneKeyModel(
    name="OneKey Mini",
    internal_name="Mini",
    minimum_version=(2, 0, 0),
    vendors=VENDORS,
    usb_ids=V1_USB_IDS,
    default_mapping=mapping.DEFAULT_MAPPING,
    protocol_version=1,
)

TOUCH = OneKeyModel(
    name="OneKey Touch",
    internal_name="Touch",
    minimum_version=(4, 0, 0),
    vendors=VENDORS,
    usb_ids=V1_USB_IDS,
    default_mapping=mapping.DEFAULT_MAPPING,
    protocol_version=1,
)

PRO = OneKeyModel(
    name="OneKey Pro",
    internal_name="Pro",
    minimum_version=(4, 0, 0),
    vendors=VENDORS,
    usb_ids=V1_USB_IDS,
    default_mapping=mapping.DEFAULT_MAPPING,
    protocol_version=1,
)

PRO_2 = OneKeyModel(
    name="OneKey Pro 2",
    internal_name="Pro2",
    minimum_version=(1, 0, 0),
    vendors=VENDORS,
    usb_ids=(USBID_ONEKEY_V2_APP,),
    default_mapping=mapping.DEFAULT_MAPPING,
    protocol_version=2,
)

NEO = OneKeyModel(
    name="OneKey Neo",
    internal_name="Neo",
    minimum_version=(1, 0, 0),
    vendors=VENDORS,
    usb_ids=(USBID_ONEKEY_V2_APP,),
    default_mapping=mapping.DEFAULT_MAPPING,
    protocol_version=2,
)

V1_MODELS = frozenset({CLASSIC, CLASSIC_1S, MINI, TOUCH, PRO})
V2_MODELS = frozenset({PRO_2, NEO})
V2_DEVICE_TYPES = {
    7: PRO_2,
    8: NEO,
}

# Compatibility aliases used by protocol_v1 / transport
LEGACY_MODELS = frozenset({CLASSIC, MINI})
CORE_MODELS = frozenset({CLASSIC_1S, TOUCH, PRO, PRO_2, NEO})
ALL_MODELS = V1_MODELS | V2_MODELS
ONEKEY_MODELS = ALL_MODELS


def by_name(name: str | None) -> OneKeyModel | None:
    if name is None:
        return None
    lowered = name.lower().replace(" ", "")
    for model in ALL_MODELS:
        if lowered in (
            model.name.lower().replace(" ", ""),
            model.internal_name.lower(),
        ):
            return model
    return None


def by_internal_name(name: str | None) -> OneKeyModel | None:
    if name is None:
        return None
    for model in ALL_MODELS:
        if model.internal_name == name:
            return model
    return None


def by_device_type(device_type: int | None) -> OneKeyModel | None:
    if device_type is None:
        return None
    return V2_DEVICE_TYPES.get(device_type)


def from_features(features: messages.Features) -> OneKeyModel:
    model = by_internal_name(features.internal_model) or by_name(features.model)
    if model is not None:
        return model
    return OneKeyModel(
        name=features.model or "OneKey",
        internal_name=features.internal_model or "Unknown",
        minimum_version=(0, 0, 0),
        vendors=VENDORS,
        usb_ids=(),
        default_mapping=mapping.DEFAULT_MAPPING,
        protocol_version=1,
        is_unknown=True,
    )


detect = from_features
