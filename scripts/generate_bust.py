#!/usr/bin/env python3
"""
Classical bust generator for Memory Palace.

Usage:
  blender --background --python scripts/generate_bust.py -- \
    --landmarks landmarks.json \
    --output bust.glb \
    --style roman

Requires Blender 4.x with Python 3.10+.
Input: JSON file with {landmarks: [{x, y, z}, ...]} (468 MediaPipe face mesh points)
Output: Draco-compressed .glb file (~50-150KB)
"""

import bpy
import bmesh
import json
import sys
import math
import argparse
from mathutils import Vector, Matrix


# ════════════════════════════════════════════
# CLI ARGUMENT PARSING
# ════════════════════════════════════════════

def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    parser = argparse.ArgumentParser(description="Generate classical bust from face landmarks")
    parser.add_argument("--landmarks", required=True, help="Path to face landmarks JSON")
    parser.add_argument("--output", required=True, help="Output .glb path")
    parser.add_argument("--style", default="roman", choices=["roman", "renaissance"])
    return parser.parse_args(argv)


# ════════════════════════════════════════════
# LANDMARK ANALYSIS
# ════════════════════════════════════════════

# Key MediaPipe face mesh landmark indices
LM = {
    "jaw_left": 234,
    "jaw_right": 454,
    "forehead_top": 10,
    "nose_bridge": 6,
    "nose_tip": 1,
    "nose_left": 129,
    "nose_right": 358,
    "chin": 152,
    "lower_lip": 17,
    "eye_inner_left": 33,
    "eye_inner_right": 263,
    "eye_outer_left": 130,
    "eye_outer_right": 359,
    "lip_left": 61,
    "lip_right": 291,
    "cheek_left": 116,
    "cheek_right": 345,
    "brow_left": 70,
    "brow_right": 300,
}

# Canonical proportions (normalized, from average face)
CANONICAL = {
    "jaw_width": 0.52,
    "forehead_height": 0.28,
    "nose_length": 0.18,
    "nose_width": 0.14,
    "chin_length": 0.10,
    "eye_spacing": 0.18,
    "face_height": 0.72,
    "lip_width": 0.24,
    "cheek_width": 0.48,
}


def dist(a, b):
    return math.sqrt((a["x"] - b["x"])**2 + (a["y"] - b["y"])**2 + (a["z"] - b["z"])**2)


def dist2d(a, b):
    return math.sqrt((a["x"] - b["x"])**2 + (a["y"] - b["y"])**2)


def extract_proportions(landmarks):
    """Extract facial proportion ratios from 468 MediaPipe landmarks."""
    lm = landmarks

    # Face bounding box for normalization
    xs = [p["x"] for p in lm]
    ys = [p["y"] for p in lm]
    face_w = max(xs) - min(xs)
    face_h = max(ys) - min(ys)
    if face_w < 0.01 or face_h < 0.01:
        return None

    # Extract measurements (normalized by face size)
    props = {}
    props["jaw_width"] = dist2d(lm[LM["jaw_left"]], lm[LM["jaw_right"]]) / face_w
    props["forehead_height"] = dist2d(lm[LM["forehead_top"]], lm[LM["nose_bridge"]]) / face_h
    props["nose_length"] = dist2d(lm[LM["nose_bridge"]], lm[LM["nose_tip"]]) / face_h
    props["nose_width"] = dist2d(lm[LM["nose_left"]], lm[LM["nose_right"]]) / face_w
    props["chin_length"] = dist2d(lm[LM["chin"]], lm[LM["lower_lip"]]) / face_h
    props["eye_spacing"] = dist2d(lm[LM["eye_inner_left"]], lm[LM["eye_inner_right"]]) / face_w
    props["face_height"] = face_h  # absolute for aspect ratio
    props["lip_width"] = dist2d(lm[LM["lip_left"]], lm[LM["lip_right"]]) / face_w
    props["cheek_width"] = dist2d(lm[LM["cheek_left"]], lm[LM["cheek_right"]]) / face_w

    # Compute ratios vs canonical (1.0 = average)
    ratios = {}
    for key in CANONICAL:
        if key in props and key in CANONICAL:
            ratios[key] = props[key] / CANONICAL[key]

    return ratios


# ════════════════════════════════════════════
# SCENE SETUP
# ════════════════════════════════════════════

def clear_scene():
    """Remove all default objects."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    # Remove orphan data
    for block in bpy.data.meshes:
        if not block.users:
            bpy.data.meshes.remove(block)


# ════════════════════════════════════════════
# BUST GEOMETRY
# ════════════════════════════════════════════

def create_head(ratios):
    """Create a head from a UV sphere, deformed by facial proportions."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32, ring_count=24, radius=0.16,
        location=(0, 0, 0.56)  # head center relative to bust origin
    )
    head = bpy.context.active_object
    head.name = "Head"

    # Apply proportion-based scaling
    jaw_r = ratios.get("jaw_width", 1.0)
    face_h_r = ratios.get("forehead_height", 1.0)
    cheek_r = ratios.get("cheek_width", 1.0)

    # Scale head based on face proportions
    head.scale.x = 0.85 + (jaw_r - 1.0) * 0.3  # width
    head.scale.y = 0.9   # front-to-back (slightly flattened)
    head.scale.z = 0.95 + (face_h_r - 1.0) * 0.2  # height

    # Enter edit mode for vertex-level adjustments
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(head.data)
    bm.verts.ensure_lookup_table()

    # Jaw narrowing/widening — affect lower vertices
    chin_r = ratios.get("chin_length", 1.0)
    for v in bm.verts:
        local_z = v.co.z  # relative to sphere center
        if local_z < -0.04:  # lower half of head
            # Taper jaw
            factor = abs(local_z + 0.04) / 0.12
            factor = min(factor, 1.0)
            v.co.x *= 1.0 - factor * 0.15 * (2.0 - jaw_r)
            # Chin extension
            if local_z < -0.10:
                v.co.z -= factor * 0.02 * (chin_r - 1.0)

        # Cheekbone prominence
        if -0.02 < local_z < 0.04:
            v.co.x *= 1.0 + (cheek_r - 1.0) * 0.15

        # Forehead height
        if local_z > 0.08:
            v.co.z += (face_h_r - 1.0) * 0.02

    bmesh.update_edit_mesh(head.data)
    bpy.ops.object.mode_set(mode="OBJECT")

    return head


def create_nose(ratios):
    """Create a nose as a lofted shape along the nose bridge."""
    nose_len = ratios.get("nose_length", 1.0)
    nose_w = ratios.get("nose_width", 1.0)

    # Profile: 4 cross-sections from bridge to tip
    sections = [
        {"z": 0.60, "sx": 0.015 * nose_w, "sy": 0.012},  # bridge top
        {"z": 0.56, "sx": 0.018 * nose_w, "sy": 0.015},  # mid bridge
        {"z": 0.52, "sx": 0.025 * nose_w, "sy": 0.020},  # ball
        {"z": 0.50, "sx": 0.020 * nose_w, "sy": 0.010},  # tip
    ]

    # Adjust z positions based on nose length
    z_offset = (nose_len - 1.0) * 0.03
    for s in sections:
        s["z"] += z_offset * (0.60 - s["z"]) / 0.10

    bm = bmesh.new()
    loops = []

    for sec in sections:
        verts = []
        n_pts = 8
        for i in range(n_pts):
            angle = (i / n_pts) * math.pi * 2
            x = math.cos(angle) * sec["sx"]
            y = -0.14 + math.sin(angle) * sec["sy"]  # protrude forward
            z = sec["z"]
            v = bm.verts.new((x, y, z))
            verts.append(v)
        loops.append(verts)

    bm.verts.ensure_lookup_table()

    # Bridge edge loops
    for i in range(len(loops) - 1):
        top = loops[i]
        bot = loops[i + 1]
        n = len(top)
        for j in range(n):
            v1 = top[j]
            v2 = top[(j + 1) % n]
            v3 = bot[(j + 1) % n]
            v4 = bot[j]
            bm.faces.new([v1, v2, v3, v4])

    # Cap top and bottom
    bm.faces.new(loops[0])
    bm.faces.new(list(reversed(loops[-1])))

    mesh = bpy.data.meshes.new("Nose")
    bm.to_mesh(mesh)
    bm.free()

    nose = bpy.data.objects.new("Nose", mesh)
    bpy.context.collection.objects.link(nose)
    return nose


def create_eye_sockets(ratios):
    """Create indentations for eye sockets using boolean subtraction spheres."""
    eye_sp = ratios.get("eye_spacing", 1.0)
    half_spacing = 0.045 * eye_sp

    sockets = []
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=12, ring_count=8, radius=0.035,
            location=(side * half_spacing, -0.12, 0.58)
        )
        socket = bpy.context.active_object
        socket.name = f"EyeSocket_{'L' if side < 0 else 'R'}"
        socket.scale.y = 0.6  # flatten front-to-back
        socket.scale.x = 1.3  # widen horizontally
        sockets.append(socket)

    return sockets


def create_brow_ridge(ratios):
    """Add a subtle brow ridge above the eye sockets."""
    bpy.ops.mesh.primitive_cube_add(size=0.01, location=(0, -0.135, 0.61))
    brow = bpy.context.active_object
    brow.name = "BrowRidge"
    brow.scale = (5.0 * ratios.get("eye_spacing", 1.0), 0.8, 0.3)

    # Add subdivision for smoothness
    mod = brow.modifiers.new("Subsurf", "SUBSURF")
    mod.levels = 2
    mod.render_levels = 2

    return brow


def create_lips(ratios):
    """Create lips as a flattened torus."""
    lip_w = ratios.get("lip_width", 1.0)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.022 * lip_w,
        minor_radius=0.008,
        major_segments=16,
        minor_segments=8,
        location=(0, -0.135, 0.48)
    )
    lips = bpy.context.active_object
    lips.name = "Lips"
    lips.scale.z = 0.5  # flatten vertically
    lips.scale.y = 0.7  # flatten depth
    return lips


def create_neck():
    """Create a tapered neck cylinder."""
    bpy.ops.mesh.primitive_cone_add(
        vertices=16, radius1=0.10, radius2=0.08,
        depth=0.18, location=(0, 0, 0.31)
    )
    neck = bpy.context.active_object
    neck.name = "Neck"
    # Slight forward tilt for classical pose
    neck.rotation_euler.x = math.radians(5)
    return neck


def create_shoulders():
    """Create draped shoulder piece (toga/tunic cut)."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24, radius=0.28, depth=0.15,
        location=(0, 0, 0.18)
    )
    shoulders = bpy.context.active_object
    shoulders.name = "Shoulders"

    # Taper slightly
    shoulders.scale.x = 1.0
    shoulders.scale.y = 0.75

    # Enter edit mode for draping effect
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(shoulders.data)
    bm.verts.ensure_lookup_table()

    # Create subtle wave displacement for toga folds
    for v in bm.verts:
        angle = math.atan2(v.co.y, v.co.x)
        fold = math.sin(angle * 5) * 0.008
        v.co.x += math.cos(angle) * fold
        v.co.y += math.sin(angle) * fold
        # Slightly droop at the edges
        r = math.sqrt(v.co.x**2 + v.co.y**2)
        if r > 0.20:
            v.co.z -= (r - 0.20) * 0.3

    bmesh.update_edit_mesh(shoulders.data)
    bpy.ops.object.mode_set(mode="OBJECT")

    return shoulders


def create_pedestal_base():
    """Create a classical pedestal base with molding profile."""
    parts = []

    # Main block
    bpy.ops.mesh.primitive_cube_add(size=0.01, location=(0, 0, 0.05))
    base = bpy.context.active_object
    base.name = "PedestalBase"
    base.scale = (18, 18, 5)
    parts.append(base)

    # Top molding (cyma recta profile via torus slice)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.17, minor_radius=0.015,
        major_segments=24, minor_segments=8,
        location=(0, 0, 0.105)
    )
    molding = bpy.context.active_object
    molding.name = "Molding"
    molding.scale.z = 0.5
    parts.append(molding)

    return parts


# ════════════════════════════════════════════
# MATERIALS
# ════════════════════════════════════════════

def create_marble_material():
    """Procedural polished marble material."""
    mat = bpy.data.materials.new("ClassicalMarble")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # Output
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (800, 0)

    # Principled BSDF
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (400, 0)
    bsdf.inputs["Roughness"].default_value = 0.25
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    # Base color: noise texture for marble grain
    noise = nodes.new("ShaderNodeTexNoise")
    noise.location = (-200, 200)
    noise.inputs["Scale"].default_value = 12.0
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.6

    # Color ramp: cream to warm gray
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.location = (0, 200)
    ramp.color_ramp.elements[0].color = (0.94, 0.92, 0.88, 1)  # cream #F0EBE0
    ramp.color_ramp.elements[1].color = (0.85, 0.82, 0.77, 1)  # warm gray #D8D0C4
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[1].position = 0.7

    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])

    # Veining: wave texture for marble veins
    wave = nodes.new("ShaderNodeTexWave")
    wave.location = (-200, -100)
    wave.inputs["Scale"].default_value = 3.0
    wave.inputs["Distortion"].default_value = 4.0
    wave.inputs["Detail"].default_value = 4.0

    vein_ramp = nodes.new("ShaderNodeValToRGB")
    vein_ramp.location = (0, -100)
    vein_ramp.color_ramp.elements[0].color = (1, 1, 1, 1)
    vein_ramp.color_ramp.elements[1].color = (0.78, 0.75, 0.72, 1)  # vein gray
    vein_ramp.color_ramp.elements[0].position = 0.4
    vein_ramp.color_ramp.elements[1].position = 0.6

    links.new(wave.outputs["Fac"], vein_ramp.inputs["Fac"])

    # Mix base color with veins
    mix = nodes.new("ShaderNodeMixRGB")
    mix.location = (200, 100)
    mix.inputs["Fac"].default_value = 0.3
    links.new(ramp.outputs["Color"], mix.inputs["Color1"])
    links.new(vein_ramp.outputs["Color"], mix.inputs["Color2"])
    links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])

    # Roughness variation
    rough_noise = nodes.new("ShaderNodeTexNoise")
    rough_noise.location = (-200, -300)
    rough_noise.inputs["Scale"].default_value = 20.0
    rough_noise.inputs["Detail"].default_value = 4.0

    rough_ramp = nodes.new("ShaderNodeValToRGB")
    rough_ramp.location = (0, -300)
    rough_ramp.color_ramp.elements[0].position = 0.3
    rough_ramp.color_ramp.elements[1].position = 0.7
    rough_ramp.color_ramp.elements[0].color = (0.15, 0.15, 0.15, 1)
    rough_ramp.color_ramp.elements[1].color = (0.35, 0.35, 0.35, 1)

    links.new(rough_noise.outputs["Fac"], rough_ramp.inputs["Fac"])
    links.new(rough_ramp.outputs["Color"], bsdf.inputs["Roughness"])

    return mat


def create_bronze_material():
    """Procedural aged bronze with patina."""
    mat = bpy.data.materials.new("AgedBronze")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (800, 0)

    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (400, 0)
    bsdf.inputs["Metallic"].default_value = 0.85
    bsdf.inputs["Roughness"].default_value = 0.35
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    # Base bronze color
    noise = nodes.new("ShaderNodeTexNoise")
    noise.location = (-200, 200)
    noise.inputs["Scale"].default_value = 8.0
    noise.inputs["Detail"].default_value = 6.0

    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.location = (0, 200)
    ramp.color_ramp.elements[0].color = (0.35, 0.29, 0.22, 1)  # dark bronze
    ramp.color_ramp.elements[1].color = (0.48, 0.38, 0.28, 1)  # warm bronze

    # Green patina in crevices
    patina_noise = nodes.new("ShaderNodeTexNoise")
    patina_noise.location = (-200, -100)
    patina_noise.inputs["Scale"].default_value = 5.0
    patina_noise.inputs["Detail"].default_value = 10.0
    patina_noise.inputs["Roughness"].default_value = 0.8

    patina_ramp = nodes.new("ShaderNodeValToRGB")
    patina_ramp.location = (0, -100)
    patina_ramp.color_ramp.elements[0].color = (0.35, 0.29, 0.22, 1)  # bronze
    patina_ramp.color_ramp.elements[1].color = (0.25, 0.40, 0.30, 1)  # green patina
    patina_ramp.color_ramp.elements[0].position = 0.55
    patina_ramp.color_ramp.elements[1].position = 0.75

    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(patina_noise.outputs["Fac"], patina_ramp.inputs["Fac"])

    mix = nodes.new("ShaderNodeMixRGB")
    mix.location = (200, 100)
    mix.inputs["Fac"].default_value = 0.4
    links.new(ramp.outputs["Color"], mix.inputs["Color1"])
    links.new(patina_ramp.outputs["Color"], mix.inputs["Color2"])
    links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])

    return mat


# ════════════════════════════════════════════
# ASSEMBLY & EXPORT
# ════════════════════════════════════════════

def apply_boolean_subtract(target, cutter):
    """Boolean difference: subtract cutter from target."""
    mod = target.modifiers.new("Bool", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "FAST"

    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier="Bool")

    bpy.data.objects.remove(cutter)


def join_objects(objects):
    """Join multiple objects into one."""
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        if obj and obj.name in bpy.data.objects:
            obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
    return bpy.context.active_object


def build_bust(ratios, style="roman"):
    """Assemble the complete bust from parts."""
    clear_scene()

    # Create all parts
    head = create_head(ratios)
    nose = create_nose(ratios)
    eye_sockets = create_eye_sockets(ratios)
    brow = create_brow_ridge(ratios)
    lips = create_lips(ratios)
    neck = create_neck()
    shoulders = create_shoulders()
    pedestal_parts = create_pedestal_base()

    # Boolean subtract eye sockets from head
    for socket in eye_sockets:
        apply_boolean_subtract(head, socket)

    # Apply all modifiers
    for obj in bpy.data.objects:
        bpy.context.view_layer.objects.active = obj
        for mod in obj.modifiers:
            try:
                bpy.ops.object.modifier_apply(modifier=mod.name)
            except Exception:
                pass

    # Join all parts
    all_parts = [head, nose, brow, lips, neck, shoulders] + pedestal_parts
    bust = join_objects(all_parts)
    bust.name = "ClassicalBust"

    # Smooth shading
    bpy.ops.object.shade_smooth()

    # Add subdivision surface for final smoothness
    mod = bust.modifiers.new("Subsurf", "SUBSURF")
    mod.levels = 1
    mod.render_levels = 2
    bpy.ops.object.modifier_apply(modifier="Subsurf")

    # Triangulate for web export
    mod = bust.modifiers.new("Tri", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier="Tri")

    # Center origin at pedestal bottom
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    bust.location = (0, 0, 0)

    # Apply material
    if style == "renaissance":
        mat = create_bronze_material()
    else:
        mat = create_marble_material()

    bust.data.materials.clear()
    bust.data.materials.append(mat)

    return bust


def export_glb(output_path):
    """Export scene as compressed GLB."""
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        export_apply=True,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
    )


# ════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════

def main():
    args = parse_args()

    # Load landmarks
    with open(args.landmarks, "r") as f:
        data = json.load(f)

    landmarks = data.get("landmarks", data)
    if isinstance(landmarks, list) and len(landmarks) >= 468:
        ratios = extract_proportions(landmarks)
    else:
        print(f"Warning: Expected 468 landmarks, got {len(landmarks) if isinstance(landmarks, list) else 'invalid'}. Using defaults.")
        ratios = {k: 1.0 for k in CANONICAL}

    if ratios is None:
        print("Warning: Could not extract proportions. Using defaults.")
        ratios = {k: 1.0 for k in CANONICAL}

    print(f"Proportion ratios: {json.dumps(ratios, indent=2)}")

    # Build and export
    bust = build_bust(ratios, style=args.style)
    print(f"Bust created: {len(bust.data.vertices)} vertices, {len(bust.data.polygons)} faces")

    export_glb(args.output)
    print(f"Exported: {args.output}")


if __name__ == "__main__":
    main()
