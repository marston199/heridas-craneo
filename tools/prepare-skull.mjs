// Offline preparation (run once): strips textures/materials, welds, decimates and writes ../js/skullmodel.js (base64 GLB).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, dedup, prune, flatten, join } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';
const [, , input, output, targetTris = '40000'] = process.argv;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
root.listTextures().forEach(t => t.dispose());
root.listMaterials().forEach(m => m.dispose());
root.listExtensionsUsed().forEach(e => e.dispose());
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives())
  for (const sem of prim.listSemantics()) if (sem !== 'POSITION' && sem !== 'NORMAL') prim.setAttribute(sem, null);
const tris = () => root.listMeshes().flatMap(m => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0);
console.log('meshes', root.listMeshes().length, 'nodes', root.listNodes().length, 'triangles before', tris());
await doc.transform(weld());
const ratio = Math.min(1, Number(targetTris) / tris());
console.log('ratio', ratio);
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 }), dedup(), prune());
console.log('triangles after', tris());
await io.write(output, doc);
const b64 = fs.readFileSync(output).toString('base64');
fs.writeFileSync('../js/skullmodel.js', '/* ScatteringSkull by Vladimir Petkovic, CC0 1.0, Khronos glTF Sample Assets (decimated) */\nwindow.SKULL_GLB_B64="' + b64 + '";\n');
console.log('glb bytes', fs.statSync(output).size, 'js/skullmodel.js bytes', fs.statSync('../js/skullmodel.js').size);
