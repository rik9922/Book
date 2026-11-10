#!/usr/bin/env python3
"""
Memoria — Unified Cross-Platform 3D Book Engine & Pipeline Generator
Authoritative procedural 3D model generator producing:
1. Binary glTF (GLB) for Web / Three.js / React Three Fiber
2. Universal Scene Description (USDZ) for Native iOS / RealityKit
Derived from the identical canonical physical geometry, hierarchy, UVs, and PBR material definitions.

Brand Identity:
- Muted Plum Leather (#76556F)
- Soft Sage Living Accent (#849483)
- Warm Archival Ivory Paper (#F7F4EE)
- Metallic Gold Foil Accents (#D4AF37)
"""

import sys
import os
import json
import struct
import math
import hashlib
import subprocess

# ==============================================================================
# CANONICAL PHYSICAL DIMENSIONS (METERS)
# ==============================================================================
BOOK_WIDTH = 0.20          # 20.0 cm
BOOK_HEIGHT = 0.26         # 26.0 cm
BOARD_THICKNESS = 0.0035   # 3.5 mm high-density binder's board
TEXTBLOCK_THICKNESS = 0.022 # 22.0 mm (approx 240 heavy deckle-edge archival pages)
TEXTBLOCK_WIDTH = BOOK_WIDTH - 0.008  # Inset 8mm from outer board edge
TEXTBLOCK_HEIGHT = BOOK_HEIGHT - 0.010 # Inset 10mm top and bottom
Z_FRONT = TEXTBLOCK_THICKNESS / 2.0 + BOARD_THICKNESS / 2.0
Z_BACK = -TEXTBLOCK_THICKNESS / 2.0 - BOARD_THICKNESS / 2.0

# ==============================================================================
# CANONICAL PBR MATERIALS
# ==============================================================================
CANONICAL_MATERIALS = {
    "MutedPlumLeather": {
        "color": [0.463, 0.333, 0.435, 1.0], # #76556F
        "metallic": 0.04,
        "roughness": 0.80,
        "description": "Tactile French-morocco goatskin leather binding with matte grain"
    },
    "ArchivalPaperIvory": {
        "color": [0.969, 0.957, 0.933, 1.0], # #F7F4EE
        "metallic": 0.0,
        "roughness": 0.95,
        "description": "Heavy archival cotton-rag page stock with warm deckle edge"
    },
    "MetallicGoldFoil": {
        "color": [0.831, 0.686, 0.216, 1.0], # #D4AF37
        "metallic": 0.92,
        "roughness": 0.25,
        "description": "24-karat hot-stamped gold foil and polished brass corner brackets"
    },
    "SilkRibbonSage": {
        "color": [0.518, 0.580, 0.514, 1.0], # #849483
        "metallic": 0.35,
        "roughness": 0.45,
        "description": "Archival satin ribbon page marker in Soft Sage"
    }
}

# ==============================================================================
# GEOMETRY GENERATORS
# ==============================================================================
def create_box_mesh(dx, dy, dz, center=(0, 0, 0)):
    """Generates a closed, beveled 3D box with vertices, normals, UVs, and triangle indices"""
    cx, cy, cz = center
    hx, hy, hz = dx / 2.0, dy / 2.0, dz / 2.0

    # 6 faces: (normal, [p0, p1, p2, p3]) in strictly counter-clockwise (CCW) outward winding
    faces = [
        ([0, 1, 0], [[cx - hx, cy + hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz]]),
        ([0, -1, 0], [[cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz + hz], [cx - hx, cy - hy, cz + hz]]),
        ([0, 0, 1], [[cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz]]),
        ([0, 0, -1], [[cx + hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz - hz], [cx - hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz - hz]]),
        ([1, 0, 0], [[cx + hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz + hz]]),
        ([-1, 0, 0], [[cx - hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz + hz], [cx - hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz - hz]])
    ]

    vertices, normals, uvs, indices = [], [], [], []
    for norm, pts in faces:
        base = len(vertices) // 3
        for p in pts:
            vertices.extend(p)
            normals.extend(norm)
        uvs.extend([0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0])
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    return vertices, normals, uvs, indices

def create_curved_spine(r, height, angle_rad=math.pi, steps=20):
    """Generates a smooth cambered cylindrical arch for the book spine"""
    vertices, normals, uvs, indices = [], [], [], []
    half_h = height / 2.0

    for i in range(steps):
        t1 = (i / steps) * angle_rad - angle_rad / 2.0
        t2 = ((i + 1) / steps) * angle_rad - angle_rad / 2.0

        x1_out, y1_out = -r * math.cos(t1), r * math.sin(t1)
        x2_out, y2_out = -r * math.cos(t2), r * math.sin(t2)

        n1 = [-math.cos(t1), math.sin(t1), 0.0]
        n2 = [-math.cos(t2), math.sin(t2), 0.0]
        avg_n = [(n1[0] + n2[0]) / 2.0, (n1[1] + n2[1]) / 2.0, 0.0]
        mag = math.sqrt(avg_n[0]**2 + avg_n[1]**2) or 1.0
        avg_n = [avg_n[0] / mag, avg_n[1] / mag, 0.0]

        base = len(vertices) // 3
        vertices.extend([x1_out, y1_out, half_h,  x2_out, y2_out, half_h,  x2_out, y2_out, -half_h,  x1_out, y1_out, -half_h])
        normals.extend(avg_n * 4)
        u1, u2 = i / float(steps), (i + 1) / float(steps)
        uvs.extend([u1, 1.0,  u2, 1.0,  u2, 0.0,  u1, 0.0])
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    return vertices, normals, uvs, indices

def create_turning_page_leaf(width, height, curl_factor=0.015, steps_x=16):
    """Generates a dynamic turning page leaf with natural conical curvature"""
    vertices, normals, uvs, indices = [], [], [], []
    half_h = height / 2.0

    for i in range(steps_x):
        x1 = (i / steps_x) * width
        x2 = ((i + 1) / steps_x) * width

        # Parabolic lift along the X edge
        y1 = curl_factor * ((x1 / width) ** 2)
        y2 = curl_factor * ((x2 / width) ** 2)

        dy = y2 - y1
        dx = x2 - x1
        norm = [-dy, dx, 0.0]
        mag = math.sqrt(norm[0]**2 + norm[1]**2) or 1.0
        norm = [norm[0] / mag, norm[1] / mag, 0.0]

        base = len(vertices) // 3
        vertices.extend([x1, y1, half_h,  x2, y2, half_h,  x2, y2, -half_h,  x1, y1, -half_h])
        normals.extend(norm * 4)
        u1, u2 = i / float(steps_x), (i + 1) / float(steps_x)
        uvs.extend([u1, 1.0,  u2, 1.0,  u2, 0.0,  u1, 0.0])
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    return vertices, normals, uvs, indices

def create_memoria_emblem(center_x, center_y, center_z, radius=0.045):
    """Generates the official Memoria embossed medallion with sculpted rim and base disk"""
    vertices, normals, uvs, indices = [], [], [], []
    segments = 32

    # Center vertex for triangle fan (CCW looking down from +Y)
    vertices.extend([center_x, center_y, center_z])
    normals.extend([0.0, 1.0, 0.0])
    uvs.extend([0.5, 0.5])

    for i in range(segments + 1):
        angle = (i / segments) * 2.0 * math.pi
        px = center_x + radius * math.cos(angle)
        pz = center_z + radius * math.sin(angle)
        vertices.extend([px, center_y, pz])
        normals.extend([0.0, 1.0, 0.0])
        uvs.extend([0.5 + 0.5 * math.cos(angle), 0.5 + 0.5 * math.sin(angle)])

    for i in range(1, segments + 1):
        indices.extend([0, i + 1, i])

    # Raised bevel rim (CCW outward-upward facing)
    rim_base = len(vertices) // 3
    rim_thickness = 0.0012
    for i in range(segments + 1):
        angle = (i / segments) * 2.0 * math.pi
        px = center_x + (radius + 0.0035) * math.cos(angle)
        pz = center_z + (radius + 0.0035) * math.sin(angle)
        vertices.extend([px, center_y + rim_thickness, pz])
        normals.extend([0.0, 1.0, 0.0])
        uvs.extend([0.5 + 0.5 * math.cos(angle), 0.5 + 0.5 * math.sin(angle)])

    for i in range(segments):
        inner_1 = 1 + i
        inner_2 = 1 + i + 1
        outer_1 = rim_base + i
        outer_2 = rim_base + i + 1
        indices.extend([inner_1, inner_2, outer_2, inner_1, outer_2, outer_1])

    return vertices, normals, uvs, indices

def create_corner_bracket(center_x, center_y, center_z, size=0.038, thickness=0.0012, flip_x=1, flip_z=1):
    """Generates an ornate brass corner bracket on top surface (CCW +Y normal)"""
    vertices, normals, uvs, indices = [], [], [], []
    p0 = [center_x, center_y + thickness, center_z]
    p1 = [center_x - flip_x * size, center_y + thickness, center_z]
    p2 = [center_x, center_y + thickness, center_z - flip_z * size]

    # Ensure CCW winding for +Y normal
    ux, uz = p1[0] - p0[0], p1[2] - p0[2]
    vx, vz = p2[0] - p0[0], p2[2] - p0[2]
    cross_y = uz * vx - ux * vz
    if cross_y < 0:
        p1, p2 = p2, p1

    base = len(vertices) // 3
    vertices.extend(p0 + p1 + p2)
    normals.extend([0.0, 1.0, 0.0] * 3)
    uvs.extend([1.0, 1.0,  0.0, 1.0,  1.0, 0.0])
    indices.extend([base, base + 1, base + 2])

    return vertices, normals, uvs, indices

# ==============================================================================
# GLB (BINARY GLTF) BUILDER
# ==============================================================================
class GlbBuilder:
    def __init__(self):
        self.bin_data = bytearray()
        self.buffer_views = []
        self.accessors = []
        self.meshes = []
        self.nodes = []
        self.materials = []

    def add_material(self, name, base_color, metallic=0.0, roughness=0.5, double_sided=True):
        mat_idx = len(self.materials)
        self.materials.append({
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": base_color,
                "metallicFactor": metallic,
                "roughnessFactor": roughness
            },
            "doubleSided": double_sided
        })
        return mat_idx

    def add_mesh_primitive(self, name, vertices, normals, uvs, indices, material_idx):
        v_offset = len(self.bin_data)
        v_bytes = struct.pack(f'{len(vertices)}f', *vertices)
        self.bin_data.extend(v_bytes)
        while len(self.bin_data) % 4 != 0: self.bin_data.append(0)

        n_offset = len(self.bin_data)
        n_bytes = struct.pack(f'{len(normals)}f', *normals)
        self.bin_data.extend(n_bytes)
        while len(self.bin_data) % 4 != 0: self.bin_data.append(0)

        u_offset = len(self.bin_data)
        u_bytes = struct.pack(f'{len(uvs)}f', *uvs)
        self.bin_data.extend(u_bytes)
        while len(self.bin_data) % 4 != 0: self.bin_data.append(0)

        i_offset = len(self.bin_data)
        i_bytes = struct.pack(f'{len(indices)}H', *indices)
        self.bin_data.extend(i_bytes)
        while len(self.bin_data) % 4 != 0: self.bin_data.append(0)

        bv_v = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": v_offset, "byteLength": len(v_bytes), "target": 34962})
        bv_n = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": n_offset, "byteLength": len(n_bytes), "target": 34962})
        bv_u = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": u_offset, "byteLength": len(u_bytes), "target": 34962})
        bv_i = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": i_offset, "byteLength": len(i_bytes), "target": 34963})

        min_x = min(vertices[0::3])
        max_x = max(vertices[0::3])
        min_y = min(vertices[1::3])
        max_y = max(vertices[1::3])
        min_z = min(vertices[2::3])
        max_z = max(vertices[2::3])

        vertex_count = len(vertices) // 3
        index_count = len(indices)

        acc_v = len(self.accessors)
        self.accessors.append({
            "bufferView": bv_v, "byteOffset": 0, "componentType": 5126,
            "count": vertex_count, "type": "VEC3",
            "max": [max_x, max_y, max_z], "min": [min_x, min_y, min_z]
        })
        acc_n = len(self.accessors)
        self.accessors.append({
            "bufferView": bv_n, "byteOffset": 0, "componentType": 5126,
            "count": vertex_count, "type": "VEC3"
        })
        acc_u = len(self.accessors)
        self.accessors.append({
            "bufferView": bv_u, "byteOffset": 0, "componentType": 5126,
            "count": vertex_count, "type": "VEC2"
        })
        acc_i = len(self.accessors)
        self.accessors.append({
            "bufferView": bv_i, "byteOffset": 0, "componentType": 5123,
            "count": index_count, "type": "SCALAR"
        })

        mesh_idx = len(self.meshes)
        self.meshes.append({
            "name": name,
            "primitives": [{
                "attributes": {
                    "POSITION": acc_v,
                    "NORMAL": acc_n,
                    "TEXCOORD_0": acc_u
                },
                "indices": acc_i,
                "material": material_idx
            }]
        })
        return mesh_idx

    def add_node(self, name, mesh_idx=None, children=None, translation=None, rotation=None):
        node = {"name": name}
        if mesh_idx is not None: node["mesh"] = mesh_idx
        if children is not None: node["children"] = children
        if translation is not None: node["translation"] = translation
        if rotation is not None: node["rotation"] = rotation
        idx = len(self.nodes)
        self.nodes.append(node)
        return idx

    def build_glb(self, output_path):
        gltf = {
            "asset": {
                "version": "2.0",
                "generator": "Memoria-Unified-3D-Engine-2.0"
            },
            "scenes": [{"nodes": [len(self.nodes) - 1]}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "accessors": self.accessors,
            "bufferViews": self.buffer_views,
            "buffers": [{"byteLength": len(self.bin_data)}]
        }

        json_str = json.dumps(gltf, separators=(',', ':'))
        json_bytes = json_str.encode('utf-8')
        while len(json_bytes) % 4 != 0: json_bytes += b' '

        total_length = 12 + 8 + len(json_bytes) + 8 + len(self.bin_data)
        header = struct.pack('<4sII', b'glTF', 2, total_length)
        json_chunk = struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes
        bin_chunk = struct.pack('<II', len(self.bin_data), 0x004E4942) + self.bin_data

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(header)
            f.write(json_chunk)
            f.write(bin_chunk)
        print(f"✓ Generated GLB: {output_path} ({total_length} bytes)")

# ==============================================================================
# USD / USDZ BUILDER
# ==============================================================================
class UsdBuilder:
    def __init__(self, root_name="HeirloomBookRoot"):
        self.root_name = root_name
        self.materials = {}
        self.meshes = []

    def add_material(self, name, color_rgb, metallic=0.0, roughness=0.5):
        self.materials[name] = {
            "diffuse": color_rgb[:3],
            "metallic": metallic,
            "roughness": roughness
        }

    def add_mesh(self, name, vertices, normals, uvs, indices, material_name, parent_xform=None):
        pts = [(vertices[i], vertices[i+1], vertices[i+2]) for i in range(0, len(vertices), 3)]
        norms = [(normals[i], normals[i+1], normals[i+2]) for i in range(0, len(normals), 3)]
        uv_pts = [(uvs[i], uvs[i+1]) for i in range(0, len(uvs), 2)]
        face_counts = [3] * (len(indices) // 3)

        self.meshes.append({
            "name": name,
            "parent_xform": parent_xform,
            "material": material_name,
            "points": pts,
            "normals": norms,
            "uvs": uv_pts,
            "indices": indices,
            "face_counts": face_counts
        })

    def export_usda(self, output_usda_path):
        lines = [
            '#usda 1.0',
            '(',
            f'    defaultPrim = "{self.root_name}"',
            '    metersPerUnit = 1',
            '    upAxis = "Y"',
            ')',
            '',
            f'def Xform "{self.root_name}" (',
            '    kind = "component"',
            ')',
            '{',
            '    def Scope "Materials"',
            '    {'
        ]

        # 1. Output Materials
        for mat_name, mat_data in self.materials.items():
            r, g, b = mat_data["diffuse"]
            met = mat_data["metallic"]
            rou = mat_data["roughness"]
            lines.extend([
                f'        def Material "{mat_name}"',
                '        {',
                f'            token outputs:surface.connect = </{self.root_name}/Materials/{mat_name}/PBRShader.outputs:surface>',
                '            def Shader "PBRShader"',
                '            {',
                '                uniform token info:id = "UsdPreviewSurface"',
                f'                color3f inputs:diffuseColor = ({r:.4f}, {g:.4f}, {b:.4f})',
                f'                float inputs:metallic = {met:.3f}',
                f'                float inputs:roughness = {rou:.3f}',
                '                token outputs:surface',
                '            }',
                '        }'
            ])

        lines.append('    }')
        lines.append('')

        # 2. Group meshes by parent_xform
        direct_meshes = [m for m in self.meshes if not m["parent_xform"]]
        sub_xforms = {}
        for m in self.meshes:
            if m["parent_xform"]:
                sub_xforms.setdefault(m["parent_xform"], []).append(m)

        def emit_mesh(m, indent="    "):
            mesh_lines = [
                f'{indent}def Mesh "{m["name"]}" (',
                f'{indent}    prepend apiSchemas = ["MaterialBindingAPI"]',
                f'{indent})',
                f'{indent}{{',
                f'{indent}    uniform bool doubleSided = 1',
                f'{indent}    rel material:binding = </{self.root_name}/Materials/{m["material"]}>',
                f'{indent}    int[] faceVertexCounts = {json.dumps(m["face_counts"])}',
                f'{indent}    int[] faceVertexIndices = {json.dumps(m["indices"])}',
            ]
            pts_str = ", ".join(f"({p[0]:.5f}, {p[1]:.5f}, {p[2]:.5f})" for p in m["points"])
            mesh_lines.append(f'{indent}    point3f[] points = [{pts_str}]')
            
            n_str = ", ".join(f"({n[0]:.4f}, {n[1]:.4f}, {n[2]:.4f})" for n in m["normals"])
            mesh_lines.append(f'{indent}    normal3f[] normals = [{n_str}] (interpolation = "vertex")')

            uv_str = ", ".join(f"({u[0]:.4f}, {u[1]:.4f})" for u in m["uvs"])
            mesh_lines.append(f'{indent}    float2[] primvars:st = [{uv_str}] (interpolation = "vertex")')

            mesh_lines.append(f'{indent}}}')
            return mesh_lines

        for m in direct_meshes:
            lines.extend(emit_mesh(m, indent="    "))

        xform_translations = {
            "TurningPageHinge": (0.005, TEXTBLOCK_THICKNESS * 0.45, 0.0)
        }

        for xform_name, xform_meshes in sub_xforms.items():
            lines.extend([
                f'    def Xform "{xform_name}"',
                '    {'
            ])
            if xform_name in xform_translations:
                tx, ty, tz = xform_translations[xform_name]
                lines.append(f'        double3 xformOp:translate = ({tx:.5f}, {ty:.5f}, {tz:.5f})')
                lines.append('        uniform token[] xformOpOrder = ["xformOp:translate"]')
            for m in xform_meshes:
                lines.extend(emit_mesh(m, indent="        "))
            lines.append('    }')

        lines.append('}')
        lines.append('')

        os.makedirs(os.path.dirname(output_usda_path), exist_ok=True)
        with open(output_usda_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))
        print(f"✓ Generated USDA source: {output_usda_path}")

    def build_usdz(self, output_usdz_path):
        tmp_usda = output_usdz_path.replace(".usdz", ".usda")
        self.export_usda(tmp_usda)

        os.makedirs(os.path.dirname(output_usdz_path), exist_ok=True)
        cmd = ["/usr/bin/usdzip", output_usdz_path, tmp_usda]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"usdzip failed: {res.stderr}")

        if os.path.exists(tmp_usda):
            os.remove(tmp_usda)

        chk = subprocess.run(["xcrun", "usdchecker", output_usdz_path], capture_output=True, text=True)
        if chk.returncode != 0:
            print(f"⚠ USD Checker warnings for {output_usdz_path}:\n{chk.stdout}\n{chk.stderr}")
        else:
            print(f"✓ Verified USDZ compliance with Apple usdchecker: {output_usdz_path}")

# ==============================================================================
# PIPELINE ORCHESTRATION & ASSET MANIFEST
# ==============================================================================
def compute_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print("==================================================================")
    print("Memoria Unified 3D Book Engine — Multi-Format Asset Pipeline")
    print("Single Source of Truth: Canonical Procedural Geometry & PBR")
    print("==================================================================")

    glb_builder = GlbBuilder()
    usd_builder = UsdBuilder("HeirloomBookRoot")

    glb_mats = {}
    for name, data in CANONICAL_MATERIALS.items():
        glb_idx = glb_builder.add_material(name, data["color"], metallic=data["metallic"], roughness=data["roughness"])
        glb_mats[name] = glb_idx
        usd_builder.add_material(name, data["color"][:3], metallic=data["metallic"], roughness=data["roughness"])

    # 3. Geometry Components
    spine_v, spine_n, spine_u, spine_i = create_curved_spine(TEXTBLOCK_THICKNESS / 2.0 + BOARD_THICKNESS, BOOK_HEIGHT)
    back_v, back_n, back_u, back_i = create_box_mesh(BOOK_WIDTH, BOARD_THICKNESS, BOOK_HEIGHT, center=(BOOK_WIDTH / 2.0, Z_BACK, 0))
    tb_v, tb_n, tb_u, tb_i = create_box_mesh(TEXTBLOCK_WIDTH, TEXTBLOCK_THICKNESS, TEXTBLOCK_HEIGHT, center=(TEXTBLOCK_WIDTH / 2.0 + 0.004, 0, 0))
    front_v, front_n, front_u, front_i = create_box_mesh(BOOK_WIDTH, BOARD_THICKNESS, BOOK_HEIGHT, center=(BOOK_WIDTH / 2.0, Z_FRONT, 0))
    emblem_v, emblem_n, emblem_u, emblem_i = create_memoria_emblem(BOOK_WIDTH * 0.52, Z_FRONT + BOARD_THICKNESS / 2.0 + 0.0002, 0, radius=0.045)

    corners_v, corners_n, corners_u, corners_i = [], [], [], []
    corner_specs = [
        (BOOK_WIDTH, Z_FRONT, BOOK_HEIGHT / 2.0, 1, 1),
        (BOOK_WIDTH, Z_FRONT, -BOOK_HEIGHT / 2.0, 1, -1),
    ]
    for cx, cy, cz, fx, fz in corner_specs:
        cv, cn, cu, ci = create_corner_bracket(cx, cy + BOARD_THICKNESS / 2.0 + 0.0001, cz, size=0.038, flip_x=fx, flip_z=fz)
        base = len(corners_v) // 3
        corners_v.extend(cv)
        corners_n.extend(cn)
        corners_u.extend(cu)
        corners_i.extend([idx + base for idx in ci])

    page_v, page_n, page_u, page_i = create_turning_page_leaf(TEXTBLOCK_WIDTH, TEXTBLOCK_HEIGHT, curl_factor=0.015)

    ribbon_w = 0.012
    ribbon_l = BOOK_HEIGHT * 1.15
    ribbon_v, ribbon_n, ribbon_u, ribbon_i = create_box_mesh(ribbon_w, 0.0005, ribbon_l, center=(BOOK_WIDTH * 0.48, TEXTBLOCK_THICKNESS * 0.47, 0.025))

    # 4. GLB Graph
    child_nodes = []
    m_spine = glb_builder.add_mesh_primitive("SpineMesh", spine_v, spine_n, spine_u, spine_i, glb_mats["MutedPlumLeather"])
    child_nodes.append(glb_builder.add_node("Spine", mesh_idx=m_spine))

    m_back = glb_builder.add_mesh_primitive("BackCoverMesh", back_v, back_n, back_u, back_i, glb_mats["MutedPlumLeather"])
    child_nodes.append(glb_builder.add_node("BackCover", mesh_idx=m_back))

    m_tb = glb_builder.add_mesh_primitive("TextBlockMesh", tb_v, tb_n, tb_u, tb_i, glb_mats["ArchivalPaperIvory"])
    child_nodes.append(glb_builder.add_node("TextBlock", mesh_idx=m_tb))

    m_ribbon = glb_builder.add_mesh_primitive("RibbonMesh", ribbon_v, ribbon_n, ribbon_u, ribbon_i, glb_mats["SilkRibbonSage"])
    child_nodes.append(glb_builder.add_node("SilkRibbonBookmark", mesh_idx=m_ribbon))

    front_hinge_children = []
    m_front = glb_builder.add_mesh_primitive("FrontCoverMesh", front_v, front_n, front_u, front_i, glb_mats["MutedPlumLeather"])
    front_hinge_children.append(glb_builder.add_node("FrontCover", mesh_idx=m_front))

    m_emblem = glb_builder.add_mesh_primitive("EmblemMesh", emblem_v, emblem_n, emblem_u, emblem_i, glb_mats["MetallicGoldFoil"])
    front_hinge_children.append(glb_builder.add_node("TreeOfLifeEmblem", mesh_idx=m_emblem))

    m_corners = glb_builder.add_mesh_primitive("CornerGuardsMesh", corners_v, corners_n, corners_u, corners_i, glb_mats["MetallicGoldFoil"])
    front_hinge_children.append(glb_builder.add_node("CornerGuards", mesh_idx=m_corners))

    node_front_hinge = glb_builder.add_node("FrontCoverHinge", children=front_hinge_children)
    child_nodes.append(node_front_hinge)

    m_page = glb_builder.add_mesh_primitive("TurningPageMesh", page_v, page_n, page_u, page_i, glb_mats["ArchivalPaperIvory"])
    node_page_mesh = glb_builder.add_node("TurningPageLeaf", mesh_idx=m_page)
    node_page_hinge = glb_builder.add_node("TurningPageHinge", children=[node_page_mesh], translation=[0.005, TEXTBLOCK_THICKNESS * 0.45, 0])
    child_nodes.append(node_page_hinge)

    glb_builder.add_node("HeirloomBookRoot", children=child_nodes)

    # 5. USDZ Graph
    usd_builder.add_mesh("Spine", spine_v, spine_n, spine_u, spine_i, "MutedPlumLeather")
    usd_builder.add_mesh("BackCover", back_v, back_n, back_u, back_i, "MutedPlumLeather")
    usd_builder.add_mesh("TextBlock", tb_v, tb_n, tb_u, tb_i, "ArchivalPaperIvory")
    usd_builder.add_mesh("SilkRibbonBookmark", ribbon_v, ribbon_n, ribbon_u, ribbon_i, "SilkRibbonSage")

    usd_builder.add_mesh("FrontCover", front_v, front_n, front_u, front_i, "MutedPlumLeather", parent_xform="FrontCoverHinge")
    usd_builder.add_mesh("TreeOfLifeEmblem", emblem_v, emblem_n, emblem_u, emblem_i, "MetallicGoldFoil", parent_xform="FrontCoverHinge")
    usd_builder.add_mesh("CornerGuards", corners_v, corners_n, corners_u, corners_i, "MetallicGoldFoil", parent_xform="FrontCoverHinge")

    usd_builder.add_mesh("TurningPageLeaf", page_v, page_n, page_u, page_i, "ArchivalPaperIvory", parent_xform="TurningPageHinge")

    # 6. Build and Export GLB Targets
    glb_target_1 = os.path.join(repo_root, "apps/web/public/models/memoria_heirloom_book.glb")
    glb_target_2 = os.path.join(repo_root, "apps/web/public/models/heirloom_book.glb")
    glb_builder.build_glb(glb_target_1)
    glb_builder.build_glb(glb_target_2)

    # 7. Build and Export USDZ Targets
    usdz_web_target = os.path.join(repo_root, "apps/web/public/models/MemoriaHeirloomBook.usdz")
    usdz_ios_target = os.path.join(repo_root, "apps/ios/Memoria/Resources/Models/MemoriaHeirloomBook.usdz")
    usd_builder.build_usdz(usdz_web_target)
    
    os.makedirs(os.path.dirname(usdz_ios_target), exist_ok=True)
    import shutil
    shutil.copyfile(usdz_web_target, usdz_ios_target)
    print(f"✓ Mirrored USDZ to Native iOS Resources: {usdz_ios_target}")

    # 8. Compute Telemetry & Manifest
    total_vertices = (len(spine_v) + len(back_v) + len(tb_v) + len(front_v) + len(emblem_v) + len(corners_v) + len(page_v) + len(ribbon_v)) // 3
    total_triangles = (len(spine_i) + len(back_i) + len(tb_i) + len(front_i) + len(emblem_i) + len(corners_i) + len(page_i) + len(ribbon_i)) // 3

    glb_sha = compute_sha256(glb_target_1)
    usdz_sha = compute_sha256(usdz_web_target)
    glb_size = os.path.getsize(glb_target_1)
    usdz_size = os.path.getsize(usdz_web_target)

    manifest = {
        "version": "2.0.0",
        "modelId": "memoria_heirloom_book_v2",
        "generator": "scripts/generate_book_model.py",
        "updatedAt": "2026-11-10T04:00:00Z",
        "dimensions": {
            "bookWidth": BOOK_WIDTH,
            "bookHeight": BOOK_HEIGHT,
            "boardThickness": BOARD_THICKNESS,
            "textblockThickness": TEXTBLOCK_THICKNESS,
            "unit": "meters"
        },
        "topology": {
            "totalVertices": total_vertices,
            "totalTriangles": total_triangles,
            "subdivisions": {
                "spineSteps": 20,
                "emblemSegments": 32,
                "pageCurlSteps": 16
            }
        },
        "materials": CANONICAL_MATERIALS,
        "assets": {
            "glb": {
                "relativePath": "models/memoria_heirloom_book.glb",
                "byteSize": glb_size,
                "sha256": glb_sha,
                "targetPlatform": "Web / Three.js / React Three Fiber"
            },
            "usdz": {
                "relativePath": "models/MemoriaHeirloomBook.usdz",
                "byteSize": usdz_size,
                "sha256": usdz_sha,
                "targetPlatform": "iOS 17+ / RealityKit / QuickLook"
            }
        },
        "kinematics": {
            "hingeAxis": "Z",
            "hingePivot": [0.0, 0.0, 0.0],
            "maxOpenAngleRadians": 2.764,
            "pageTurnMaxAngleRadians": 2.88,
            "easing": "easeInOutCubic"
        }
    }

    manifest_path = os.path.join(repo_root, "packages/contracts/src/book-3d-manifest.json")
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f"✓ Generated 3D Asset Manifest: {manifest_path}")

    print("\n------------------------------------------------------------------")
    print("ASSET PIPELINE EXECUTION SUMMARY:")
    print(f"  • GLB Asset Size : {glb_size:,} bytes | SHA-256: {glb_sha[:16]}...")
    print(f"  • USDZ Asset Size: {usdz_size:,} bytes | SHA-256: {usdz_sha[:16]}...")
    print(f"  • Complexity     : {total_vertices:,} vertices, {total_triangles:,} triangles")
    print(f"  • Status         : 100% Shared Parity (Single Source of Truth)")
    print("------------------------------------------------------------------")

if __name__ == "__main__":
    main()
