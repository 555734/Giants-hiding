#!/usr/bin/env bash
# Match the reviewed DCC exporter. Actor workers use the system Blender;
# architecture is prepared once and passed to all render jobs as an artifact.
set -euo pipefail
PV_ARCH_ROOT="${RUNNER_TEMP:?}/giants-architecture-blender"
mkdir -p "$PV_ARCH_ROOT/bin" "$PV_ARCH_ROOT/pylibs"
curl --fail --location --retry 3 'https://download.blender.org/release/Blender4.3/blender-4.3.2-linux-x64.tar.xz' -o "$PV_ARCH_ROOT/blender.tar.xz"
printf '%s  %s\n' '4da1c956673c0485e63054e563ee69198cc8f80d8157dd7592dffc8a6a5592e6' "$PV_ARCH_ROOT/blender.tar.xz" | sha256sum --check -
tar -xf "$PV_ARCH_ROOT/blender.tar.xz" -C "$PV_ARCH_ROOT/bin" --strip-components=1
python3 -m pip install --target "$PV_ARCH_ROOT/pylibs" --platform manylinux_2_28_x86_64 --python-version 3.11 --implementation cp --abi cp311 --only-binary=:all: --no-deps Pillow==10.4.0
printf 'ARCHITECTURE_BLENDER=%s/bin/blender\nARCHITECTURE_PYLIBS=%s/pylibs\n' "$PV_ARCH_ROOT" "$PV_ARCH_ROOT" >> "$GITHUB_ENV"
