#!/usr/bin/env python3
"""
Memoria — Procedural 3D Heirloom Book Generator & Blender Pipeline
Generates an anatomically accurate, multi-part 3D hardcover book model:
- Front Cover Board (independent articulable node)
- Back Cover Board (independent node)
- Cambered Curved Spine (flexible hinge zone)
- Archival Text Block (layered paper edge)
- Dynamic Turning Page Leaf (for conical page curl rendering)
- Silk Ribbon Bookmark (draping gold ribbon)
- Antique Gold Corner Guards (embossed brass brackets)
- Embossed Tree of Life Cover Medallion (Memoria Brand Emblem)
- 4 PBR Materials: Deep Emerald Leather, Archival Paper, Metallic Gold Foil, Silk Ribbon
"""

import sys
import os
import json
import struct
import math

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
        # 1. Pack vertices (Vec3 Float)
        v_offset = len(self.bin_data)
        v_bytes = struct.pack(f'{len(vertices)}f', *vertices)
        self.bin_data.extend(v_bytes)
        # Pad to 4 bytes
        while len(self.bin_data) % 4 != 0:
            self.bin_data.append(0)

        # 2. Pack normals (Vec3 Float)
        n_offset = len(self.bin_data)
        n_bytes = struct.pack(f'{len(normals)}f', *normals)
        self.bin_data.extend(n_bytes)
        while len(self.bin_data) % 4 != 0:
            self.bin_data.append(0)

        # 3. Pack UVs (Vec2 Float)
        u_offset = len(self.bin_data)
        u_bytes = struct.pack(f'{len(uvs)}f', *uvs)
        self.bin_data.extend(u_bytes)
        while len(self.bin_data) % 4 != 0:
            self.bin_data.append(0)

        # 4. Pack indices (Scalar Unsigned Short)
        i_offset = len(self.bin_data)
        i_bytes = struct.pack(f'{len(indices)}H', *indices)
        self.bin_data.extend(i_bytes)
        while len(self.bin_data) % 4 != 0:
            self.bin_data.append(0)

        # Buffer views
        bv_v = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": v_offset, "byteLength": len(v_bytes), "target": 34962})
        bv_n = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": n_offset, "byteLength": len(n_bytes), "target": 34962})
        bv_u = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": u_offset, "byteLength": len(u_bytes), "target": 34962})
        bv_i = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": i_offset, "byteLength": len(i_bytes), "target": 34963})

        # Min / Max bounds for position
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
        node_idx = len(self.nodes)
        node = {"name": name}
        if mesh_idx is not None:
            node["mesh"] = mesh_idx
        if children:
            node["children"] = children
        if translation:
            node["translation"] = translation
        if rotation:
            node["rotation"] = rotation
        self.nodes.append(node)
        return node_idx

    def build_glb(self, output_path):
        gltf = {
            "asset": {
                "version": "2.0",
                "generator": "Memoria-PhotorealisticHeirloomBookPipeline-2.0"
            },
            "scenes": [{"nodes": [len(self.nodes) - 1]}], # Last node is root
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "accessors": self.accessors,
            "bufferViews": self.buffer_views,
            "buffers": [{"byteLength": len(self.bin_data)}]
        }

        json_str = json.dumps(gltf, separators=(',', ':'))
        json_bytes = json_str.encode('utf-8')
        while len(json_bytes) % 4 != 0:
            json_bytes += b' '

        total_length = 12 + 8 + len(json_bytes) + 8 + len(self.bin_data)
        header = struct.pack('<4sII', b'glTF', 2, total_length)
        json_chunk = struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes
        bin_chunk = struct.pack('<II', len(self.bin_data), 0x004E4942) + self.bin_data

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(header)
            f.write(json_chunk)
            f.write(bin_chunk)
        print(f"✓ Successfully generated GLB: {output_path} ({total_length} bytes)")

def create_box_mesh(dx, dy, dz, center=(0, 0, 0)):
    """Generates a closed 3D box with vertices, normals, uvs, and indices"""
    cx, cy, cz = center
    hx, hy, hz = dx / 2, dy / 2, dz / 2

    # 6 faces: (norm, [p0, p1, p2, p3])
    faces = [
        # Top (+Y)
        ([0, 1, 0], [[cx - hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz]]),
        # Bottom (-Y)
        ([0, -1, 0], [[cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz - hz]]),
        # Front (+Z)
        ([0, 0, 1], [[cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz]]),
        # Back (-Z)
        ([0, 0, -1], [[cx + hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz - hz], [cx - hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz - hz]]),
        # Right (+X)
        ([1, 0, 0], [[cx + hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz + hz]]),
        # Left (-X)
        ([-1, 0, 0], [[cx - hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz + hz], [cx - hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz - hz]])
    ]

    vertices, normals, uvs, indices = [], [], [], []
    for norm, pts in faces:
        base = len(vertices) // 3
        for p in pts:
            vertices.extend(p)
            normals.extend(norm)
        uvs.extend([0, 0,  1, 0,  1, 1,  0, 1])
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    return vertices, normals, uvs, indices

def create_curved_spine(r, height, angle_rad=math.pi, steps=16, thickness=0.0035):
    """Generates a smooth cambered cylindrical arch for the book spine"""
    vertices, normals, uvs, indices = [], [], [], []
    half_h = height / 2

    for i in range(steps):
        t1 = (i / steps) * angle_rad - angle_rad / 2
        t2 = ((i + 1) / steps) * angle_rad - angle_rad / 2

        # Outer surface
        x1_out, y1_out = -r * math.cos(t1), r * math.sin(t1)
        x2_out, y2_out = -r * math.cos(t2), r * math.sin(t2)

        # Normals
        n1 = [-math.cos(t1), math.sin(t1), 0]
        n2 = [-math.cos(t2), math.sin(t2), 0]
        avg_n = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2, 0]
        mag = math.sqrt(avg_n[0]**2 + avg_n[1]**2) or 1
        avg_n = [avg_n[0] / mag, avg_n[1] / mag, 0]

        base = len(vertices) // 3
        vertices.extend([x1_out, y1_out, -half_h,  x2_out, y2_out, -half_h,  x2_out, y2_out, half_h,  x1_out, y1_out, half_h])
        normals.extend(avg_n * 4)
        u1, u2 = i / steps, (i + 1) / steps
        uvs.extend([u1, 0,  u2, 0,  u2, 1,  u1, 1])
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    return vertices, normals, uvs, indices

def create_turning_page_leaf(width, height, curl_factor=0.015, steps_x=12):
    """Generates a dynamic turning page leaf with natural conical curvature"""
    vertices, normals, uvs, indices = [], [], [], []
    half_h = height / 2

    for i in range(steps_x):
        x1 = (i / steps_x) * width
        x2 = ((i + 1) / steps_x) * width

        # Parabolic lift along the X edge
        y1 = curl_factor * ((x1 / width) ** 2)
        y2 = curl_factor * ((x2 / width) ** 2)

        # Upward normal
        dy = y2 - y1
        dx = x2 - x1
        norm = [-dy, dx, 0]
        mag = math.sqrt(norm[0]**2 + norm[1]**2) or 1
        norm = [norm[0] / mag, norm[1] / mag, 0]

        base = len(vertices) // 3
        # Quad
        vertices.extend([x1, y1, -half_h,  x2, y2, -half_h,  x2, y2, half_h,  x1, y1, half_h])
        normals.extend(norm * 4)
        u1, u2 = i / steps_x, (i + 1) / steps_x
        uvs.extend([u1, 0,  u2, 0,  u2, 1,  u1, 1])
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    return vertices, normals, uvs, indices

def create_tree_of_life_emblem(center_x, center_y, center_z, radius=0.045):
    """Generates golden embossed Tree of Life medallion geometry for the front cover"""
    vertices, normals, uvs, indices = [], [], [], []
    segments = 24
    base = 0

    # Disk base
    vertices.extend([center_x, center_y, center_z])
    normals.extend([0, 1, 0])
    uvs.extend([0.5, 0.5])

    for i in range(segments + 1):
        angle = (i / segments) * 2 * math.pi
        px = center_x + radius * math.cos(angle)
        pz = center_z + radius * math.sin(angle)
        vertices.extend([px, center_y, pz])
        normals.extend([0, 1, 0])
        uvs.extend([0.5 + 0.5 * math.cos(angle), 0.5 + 0.5 * math.sin(angle)])

    for i in range(1, segments + 1):
        indices.extend([0, i, i + 1])

    # Embossed rim
    rim_base = len(vertices) // 3
    rim_thickness = 0.001
    for i in range(segments + 1):
        angle = (i / segments) * 2 * math.pi
        px = center_x + (radius + 0.003) * math.cos(angle)
        pz = center_z + (radius + 0.003) * math.sin(angle)
        vertices.extend([px, center_y + rim_thickness, pz])
        normals.extend([0, 1, 0])
        uvs.extend([0.5 + 0.5 * math.cos(angle), 0.5 + 0.5 * math.sin(angle)])

    for i in range(segments):
        idx1 = rim_base + i
        idx2 = rim_base + i + 1
        indices.extend([idx1, idx2, (idx1 - rim_base + 1) % segments + 1])

    return vertices, normals, uvs, indices

def create_corner_bracket(center_x, center_y, center_z, size=0.035, thickness=0.001, flip_x=1, flip_z=1):
    """Generates an ornate brass corner protector"""
    vertices, normals, uvs, indices = [], [], [], []
    # Triangular bracket on top surface
    p0 = [center_x, center_y + thickness, center_z]
    p1 = [center_x - flip_x * size, center_y + thickness, center_z]
    p2 = [center_x, center_y + thickness, center_z - flip_z * size]

    base = len(vertices) // 3
    vertices.extend(p0 + p1 + p2)
    normals.extend([0, 1, 0] * 3)
    uvs.extend([1, 1,  0, 1,  1, 0])
    indices.extend([base, base + 1, base + 2])

    return vertices, normals, uvs, indices

def main():
    builder = GlbBuilder()

    # Define PBR Materials
    # 1. Deep Emerald Leather (Memoria Brand Signature)
    mat_leather = builder.add_material("HeirloomEmeraldLeather", [0.08, 0.22, 0.16, 1.0], metallic=0.03, roughness=0.82)
    # 2. Archival Paper Stock (Warm Ivory)
    mat_paper = builder.add_material("ArchivalPaperIvory", [0.97, 0.95, 0.91, 1.0], metallic=0.0, roughness=0.94)
    # 3. Metallic Gold Foil / Embossed Brass
    mat_gold = builder.add_material("MetallicGoldFoil", [0.86, 0.70, 0.24, 1.0], metallic=0.92, roughness=0.24)
    # 4. Silk Ribbon Bookmark
    mat_silk = builder.add_material("SilkRibbonGold", [0.83, 0.62, 0.18, 1.0], metallic=0.35, roughness=0.55)

    # Dimensions
    book_w = 0.20
    book_h = 0.26
    board_t = 0.0035
    textblock_t = 0.022
    z_front = textblock_t / 2 + board_t / 2
    z_back = -textblock_t / 2 - board_t / 2

    child_nodes = []

    # 1. Spine (cambered curved leather arch)
    spine_v, spine_n, spine_u, spine_i = create_curved_spine(textblock_t / 2 + board_t, book_h)
    mesh_spine = builder.add_mesh_primitive("SpineMesh", spine_v, spine_n, spine_u, spine_i, mat_leather)
    node_spine = builder.add_node("Spine", mesh_idx=mesh_spine)
    child_nodes.append(node_spine)

    # 2. Back Cover Board (stationary base)
    back_v, back_n, back_u, back_i = create_box_mesh(book_w, board_t, book_h, center=(book_w / 2, z_back, 0))
    mesh_back = builder.add_mesh_primitive("BackCoverMesh", back_v, back_n, back_u, back_i, mat_leather)
    node_back = builder.add_node("BackCover", mesh_idx=mesh_back)
    child_nodes.append(node_back)

    # 3. Text Block (interior layered archival pages)
    tb_w = book_w - 0.008
    tb_h = book_h - 0.010
    tb_v, tb_n, tb_u, tb_i = create_box_mesh(tb_w, textblock_t, tb_h, center=(tb_w / 2 + 0.004, 0, 0))
    mesh_tb = builder.add_mesh_primitive("TextBlockMesh", tb_v, tb_n, tb_u, tb_i, mat_paper)
    node_tb = builder.add_node("TextBlock", mesh_idx=mesh_tb)
    child_nodes.append(node_tb)

    # 4. Front Cover Board (independent articulable node pivoted at hinge)
    front_v, front_n, front_u, front_i = create_box_mesh(book_w, board_t, book_h, center=(book_w / 2, z_front, 0))
    mesh_front = builder.add_mesh_primitive("FrontCoverMesh", front_v, front_n, front_u, front_i, mat_leather)
    node_front = builder.add_node("FrontCover", mesh_idx=mesh_front)
    child_nodes.append(node_front)

    # 5. Tree of Life Medallion Emblem on Front Cover
    emblem_v, emblem_n, emblem_u, emblem_i = create_tree_of_life_emblem(book_w * 0.52, z_front + board_t / 2 + 0.0002, 0, radius=0.045)
    mesh_emblem = builder.add_mesh_primitive("EmblemMesh", emblem_v, emblem_n, emblem_u, emblem_i, mat_gold)
    node_emblem = builder.add_node("TreeOfLifeEmblem", mesh_idx=mesh_emblem)
    child_nodes.append(node_emblem)

    # 6. Brass Corner Guards on Front Cover
    corners_v, corners_n, corners_u, corners_i = [], [], [], []
    corner_specs = [
        (book_w, z_front, book_h / 2, 1, 1),
        (book_w, z_front, -book_h / 2, 1, -1),
    ]
    for cx, cy, cz, fx, fz in corner_specs:
        cv, cn, cu, ci = create_corner_bracket(cx, cy + board_t / 2 + 0.0001, cz, size=0.038, flip_x=fx, flip_z=fz)
        base = len(corners_v) // 3
        corners_v.extend(cv)
        corners_n.extend(cn)
        corners_u.extend(cu)
        corners_i.extend([idx + base for idx in ci])

    mesh_corners = builder.add_mesh_primitive("CornerGuardsMesh", corners_v, corners_n, corners_u, corners_i, mat_gold)
    node_corners = builder.add_node("CornerGuards", mesh_idx=mesh_corners)
    child_nodes.append(node_corners)

    # 7. Turning Page Leaf (interactive curved page)
    page_v, page_n, page_u, page_i = create_turning_page_leaf(tb_w, tb_h, curl_factor=0.012)
    mesh_page = builder.add_mesh_primitive("TurningPageMesh", page_v, page_n, page_u, page_i, mat_paper)
    node_page = builder.add_node("TurningPageLeaf", mesh_idx=mesh_page, translation=[0.005, textblock_t * 0.45, 0])
    child_nodes.append(node_page)

    # 8. Silk Ribbon Bookmark
    ribbon_w = 0.012
    ribbon_l = book_h * 1.15
    ribbon_v, ribbon_n, ribbon_u, ribbon_i = create_box_mesh(ribbon_w, 0.0006, ribbon_l, center=(book_w * 0.48, z_front + 0.001, 0.02))
    mesh_ribbon = builder.add_mesh_primitive("RibbonMesh", ribbon_v, ribbon_n, ribbon_u, ribbon_i, mat_silk)
    node_ribbon = builder.add_node("SilkRibbonBookmark", mesh_idx=mesh_ribbon)
    child_nodes.append(node_ribbon)

    # Root Node
    builder.add_node("HeirloomBookRoot", children=child_nodes)

    # Export targets
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_1 = os.path.join(repo_root, "apps/web/public/models/heirloom_book.glb")
    target_2 = os.path.join(repo_root, "apps/web/public/models/memoria_heirloom_book.glb")

    builder.build_glb(target_1)
    builder.build_glb(target_2)

if __name__ == "__main__":
    main()
