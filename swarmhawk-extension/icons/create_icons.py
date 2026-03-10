#!/usr/bin/env python3
"""Generate simple SwarmHawk icons using only stdlib."""
import struct
import zlib
import math

def create_png(size):
    """Create a minimal SwarmHawk icon PNG (dark bg + red hawk silhouette)."""
    # Create RGBA pixel data
    pixels = []
    cx, cy = size / 2, size / 2
    r = size / 2 - 1

    for y in range(size):
        row = []
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx*dx + dy*dy)

            if dist > r:
                # Transparent outside circle
                row.extend([0, 0, 0, 0])
            else:
                # Dark background
                bg = [14, 13, 18, 255]

                # Draw a simple hawk wing shape (two arcs)
                # Normalize to -1..1
                nx = dx / r
                ny = dy / r

                # Wing body: ellipse in middle
                in_body = (nx**2 / 0.25 + ny**2 / 0.5) <= 1
                # Left wing arc
                in_left_wing = (((nx + 0.55)**2 / 0.35 + (ny - 0.1)**2 / 0.08) <= 1)
                # Right wing arc
                in_right_wing = (((nx - 0.55)**2 / 0.35 + (ny - 0.1)**2 / 0.08) <= 1)
                # Head circle
                in_head = ((nx**2 + (ny + 0.45)**2) <= 0.08)
                # Tail
                in_tail = (abs(nx) < 0.15 and ny > 0.3)

                if in_body or in_left_wing or in_right_wing or in_head or in_tail:
                    row.extend([192, 57, 43, 255])  # Red #C0392B
                else:
                    row.extend(bg)

            pixels.append(row[-4:] if row else [0, 0, 0, 0])

    # Build PNG
    def make_chunk(chunk_type, data):
        c = chunk_type + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)

    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'

    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)

    # IDAT
    raw_rows = []
    for y in range(size):
        row_bytes = bytearray([0])  # filter type none
        for x in range(size):
            p = pixels[y * size + x]
            row_bytes.extend([p[0], p[1], p[2]])  # RGB only (IHDR color type 2)
        raw_rows.append(bytes(row_bytes))

    # Rebuild as RGB (no alpha in IHDR type 2, just drop alpha for simplicity)
    # Use RGBA instead: IHDR color type 6
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)

    raw_rows = []
    for y in range(size):
        row_bytes = bytearray([0])
        for x in range(size):
            p = pixels[y * size + x]
            row_bytes.extend(p)  # RGBA
        raw_rows.append(bytes(row_bytes))

    compressed = zlib.compress(b''.join(raw_rows), 9)
    idat = make_chunk(b'IDAT', compressed)

    # IEND
    iend = make_chunk(b'IEND', b'')

    return sig + ihdr + idat + iend


for size in [16, 48, 128]:
    data = create_png(size)
    with open(f'icon{size}.png', 'wb') as f:
        f.write(data)
    print(f'Created icon{size}.png ({len(data)} bytes)')
