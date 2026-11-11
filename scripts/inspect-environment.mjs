import {NodeIO} from '@gltf-transform/core';
import sharp from 'sharp';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
for(const file of process.argv.slice(2)){const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file);for(const t of doc.getRoot().listTextures())console.log(file,t.getName(),t.getURI(),await sharp(t.getImage()).metadata());}
