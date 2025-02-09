import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { DiceManager } from './dice-manager';
import { DiceOptions, DiceVectors, DiceMaterialOptions, ChamferGeometry } from './dice-types';

export class DiceObject {
    object: THREE.Mesh;
    size: number;
    invertUpside: boolean;
    materialOptions: DiceMaterialOptions;
    labelColor: string;
    diceColor: string;
    customTextTextureFunction?: (text: string | number[], color: string, backColor: string) => THREE.Texture;
    mass: number;
    inertia: number;
    vertices: number[][];
    faces: number[][];
    tab: number;
    af: number;
    chamfer: number;
    scaleFactor: number;
    values: number;
    textMargin: number;
    faceTexts: (string | number[])[];
    simulationRunning: boolean;

    constructor(options: DiceOptions) {
        options = this.setDefaults(options, {
            size: 100,
            fontColor: '#000000',
            backColor: '#ffffff'
        });

        this.object = null;
        this.size = options.size;
        this.invertUpside = false;

        this.materialOptions = {
            specular: 0x172022,
            color: 0xf0f0f0,
            shininess: 40,
            flatShading: true,
        };
        this.labelColor = options.fontColor;
        this.diceColor = options.backColor;
        
        // Ensure DiceManager world is initialized
        if (!DiceManager.world) {
            throw new Error('DiceManager world must be initialized before creating dice');
        }
    }

    setDefaults(options: DiceOptions, defaults: DiceOptions): DiceOptions {
        options = options || {};

        for (let key in defaults) {
            if (!defaults.hasOwnProperty(key)) continue;

            if (!(key in options)) {
                options[key] = defaults[key];
            }
        }

        return options;
    }

    emulateThrow(callback: (value: number) => void): void {
        let stableCount = 0;

        const check = (): void => {
            if (this.isFinished()) {
                stableCount++;

                if (stableCount === 50) {
                    DiceManager.world.removeEventListener('postStep', check);
                    callback(this.getUpsideValue());
                }
            } else {
                stableCount = 0;
            }

            DiceManager.world.step(DiceManager.world.dt);
        };

        DiceManager.world.addEventListener('postStep', check);
    }

    isFinished(): boolean {
        let threshold = 1;

        let angularVelocity = this.object.body.angularVelocity;
        let velocity = this.object.body.velocity;

        return (Math.abs(angularVelocity.x) < threshold && Math.abs(angularVelocity.y) < threshold && Math.abs(angularVelocity.z) < threshold &&
            Math.abs(velocity.x) < threshold && Math.abs(velocity.y) < threshold && Math.abs(velocity.z) < threshold);
    }

    getUpsideValue(): number {
        let vector = new THREE.Vector3(0, this.invertUpside ? -1 : 1);
        let closest_face;
        let closest_angle = Math.PI * 2;

        let normals = this.object.geometry.getAttribute('normal').array;
        for (let i = 0; i < this.object.geometry.groups.length; ++i) {
            let face = this.object.geometry.groups[i];
            if (face.materialIndex === 0) continue;

            let startVertex = i * 9;
            let normal = new THREE.Vector3(normals[startVertex], normals[startVertex + 1], normals[startVertex + 2]);
            let angle = normal.clone().applyQuaternion(this.object.body.quaternion).angleTo(vector);
            if (angle < closest_angle) {
                closest_angle = angle;
                closest_face = face;
            }
        }

        return closest_face.materialIndex - 1;
    }

    getCurrentVectors(): DiceVectors {
        return {
            position: this.object.body.position.clone(),
            quaternion: this.object.body.quaternion.clone(),
            velocity: this.object.body.velocity.clone(),
            angularVelocity: this.object.body.angularVelocity.clone()
        };
    }

    setVectors(vectors: DiceVectors): void {
        this.object.body.position = vectors.position;
        this.object.body.quaternion = vectors.quaternion;
        this.object.body.velocity = vectors.velocity;
        this.object.body.angularVelocity = vectors.angularVelocity;
    }

    shiftUpperValue(toValue: number): void {
        let geometry = this.object.geometry.clone();

        let fromValue = this.getUpsideValue();
        for (let i = 0, l = geometry.groups.length; i < l; ++i) {
            let materialIndex = geometry.groups[i].materialIndex;
            if (materialIndex === 0) continue;

            materialIndex += toValue - fromValue - 1;
            while (materialIndex > this.values) materialIndex -= this.values;
            while (materialIndex < 1) materialIndex += this.values;

            geometry.groups[i].materialIndex = materialIndex + 1;
        }

        this.updateMaterialsForValue(toValue - fromValue);

        this.object.geometry = geometry;
    }

    getChamferGeometry(vectors: THREE.Vector3[], faces: number[][], chamfer: number): ChamferGeometry {
        let chamfer_vectors: THREE.Vector3[] = [];
        let chamfer_faces: number[][] = [];
        let corner_faces: number[][] = new Array(vectors.length);
        
        for (let i = 0; i < vectors.length; ++i) corner_faces[i] = [];
        for (let i = 0; i < faces.length; ++i) {
            let ii = faces[i], fl = ii.length - 1;
            let center_point = new THREE.Vector3();
            let face: number[] = new Array(fl);
            
            for (let j = 0; j < fl; ++j) {
                let vv = vectors[ii[j]].clone();
                center_point.add(vv);
                corner_faces[ii[j]].push(face[j] = chamfer_vectors.push(vv) - 1);
            }
            
            center_point.divideScalar(fl);
            for (let j = 0; j < fl; ++j) {
                let vv = chamfer_vectors[face[j]];
                vv.subVectors(vv, center_point).multiplyScalar(chamfer).addVectors(vv, center_point);
            }
            face.push(ii[fl]);
            chamfer_faces.push(face);
        }

        for (let i = 0; i < faces.length - 1; ++i) {
            for (let j = i + 1; j < faces.length; ++j) {
                let pairs: number[][] = [], lastm = -1;
                for (let m = 0; m < faces[i].length - 1; ++m) {
                    let n = faces[j].indexOf(faces[i][m]);
                    if (n >= 0 && n < faces[j].length - 1) {
                        if (lastm >= 0 && m !== lastm + 1) pairs.unshift([i, m], [j, n]);
                        else pairs.push([i, m], [j, n]);
                        lastm = m;
                    }
                }
                if (pairs.length !== 4) continue;
                chamfer_faces.push([
                    chamfer_faces[pairs[0][0]][pairs[0][1]],
                    chamfer_faces[pairs[1][0]][pairs[1][1]],
                    chamfer_faces[pairs[3][0]][pairs[3][1]],
                    chamfer_faces[pairs[2][0]][pairs[2][1]],
                    -1
                ]);
            }
        }

        for (let i = 0; i < corner_faces.length; ++i) {
            let cf = corner_faces[i], face = [cf[0]], count = cf.length - 1;
            while (count) {
                for (let m = faces.length; m < chamfer_faces.length; ++m) {
                    let index = chamfer_faces[m].indexOf(face[face.length - 1]);
                    if (index >= 0 && index < 4) {
                        if (--index === -1) index = 3;
                        let next_vertex = chamfer_faces[m][index];
                        if (cf.indexOf(next_vertex) >= 0) {
                            face.push(next_vertex);
                            break;
                        }
                    }
                }
                --count;
            }
            face.push(-1);
            chamfer_faces.push(face);
        }

        return { vectors: chamfer_vectors, faces: chamfer_faces };
    }

    makeGeometry(vertices: THREE.Vector3[], faces: number[][], radius: number, tab: number, af: number): THREE.BufferGeometry {
        let geom = new THREE.BufferGeometry();

        for (let i = 0; i < vertices.length; ++i) {
            vertices[i] = vertices[i].multiplyScalar(radius);
        }

        let positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];

        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();
        let materialIndex: number;
        let faceFirstVertexIndex = 0;

        for (let i = 0; i < faces.length; ++i) {
            let ii = faces[i], fl = ii.length - 1;
            let aa = Math.PI * 2 / fl;
            materialIndex = ii[fl] + 1;
            
            for (let j = 0; j < fl - 2; ++j) {
                positions.push(...vertices[ii[0]].toArray());
                positions.push(...vertices[ii[j + 1]].toArray());
                positions.push(...vertices[ii[j + 2]].toArray());

                cb.subVectors(vertices[ii[j + 2]], vertices[ii[j + 1]]);
                ab.subVectors(vertices[ii[0]], vertices[ii[j + 1]]);
                cb.cross(ab);
                cb.normalize();

                normals.push(...cb.toArray());
                normals.push(...cb.toArray());
                normals.push(...cb.toArray());

                uvs.push(
                    (Math.cos(af) + 1 + tab) / 2 / (1 + tab),
                    (Math.sin(af) + 1 + tab) / 2 / (1 + tab),
                    (Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab),
                    (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab),
                    (Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab),
                    (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab)
                );
            }

            let numOfVertices = (fl - 2) * 3;
            for (let i = 0; i < numOfVertices/3; i++) {
                geom.addGroup(faceFirstVertexIndex, 3, materialIndex);
                faceFirstVertexIndex += 3;
            }
        }

        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);
        
        return geom;
    }

    createShape(vertices: THREE.Vector3[], faces: number[][], radius: number): CANNON.ConvexPolyhedron {
        let cv: CANNON.Vec3[] = new Array(vertices.length);
        let cf: number[][] = new Array(faces.length);
        
        for (let i = 0; i < vertices.length; ++i) {
            let v = vertices[i];
            cv[i] = new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius);
        }
        
        for (let i = 0; i < faces.length; ++i) {
            cf[i] = faces[i].slice(0, faces[i].length - 1);
        }
        
        return new CANNON.ConvexPolyhedron(cv, cf);
    }

    getGeometry(): THREE.BufferGeometry {
        let radius = this.size * this.scaleFactor;

        let vectors: THREE.Vector3[] = new Array(this.vertices.length);
        for (let i = 0; i < this.vertices.length; ++i) {
            vectors[i] = (new THREE.Vector3()).fromArray(this.vertices[i]).normalize();
        }

        let chamferGeometry = this.getChamferGeometry(vectors, this.faces, this.chamfer);
        let geometry = this.makeGeometry(chamferGeometry.vectors, chamferGeometry.faces, radius, this.tab, this.af);
        geometry.cannon_shape = this.createShape(vectors, this.faces, radius);

        return geometry;
    }

    calculateTextureSize(approx: number): number {
        return Math.max(128, Math.pow(2, Math.floor(Math.log(approx) / Math.log(2))));
    }

    createTextTexture(text: string | number[], color: string, backColor: string): THREE.Texture {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        let ts = this.calculateTextureSize(this.size / 2 + this.size * this.textMargin) * 2;
        canvas.width = canvas.height = ts;
        context.font = ts / (1 + 2 * this.textMargin) + "pt Arial";
        context.fillStyle = backColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = color;
        context.fillText(text.toString(), canvas.width / 2, canvas.height / 2);
        let texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    getMaterials(): THREE.Material[] {
        let materials: THREE.Material[] = [];
        for (let i = 0; i < this.faceTexts.length; ++i) {
            let texture = null;
            if (this.customTextTextureFunction) {
                texture = this.customTextTextureFunction(this.faceTexts[i], this.labelColor, this.diceColor);
            } else {
                texture = this.createTextTexture(this.faceTexts[i], this.labelColor, this.diceColor);
            }

            materials.push(new THREE.MeshPhongMaterial(Object.assign({}, this.materialOptions, { map: texture })));
        }
        return materials;
    }

    getObject(): THREE.Mesh {
        return this.object;
    }

    create(): THREE.Mesh {
        console.log('Creating dice object...');
        if (!DiceManager.world) {
            console.error('DiceManager.world is not initialized');
            throw new Error('You must call DiceManager.setWorld(world) first.');
        }
        console.log('DiceManager.world is initialized, proceeding with dice creation...');
        this.object = new THREE.Mesh(this.getGeometry(), this.getMaterials());

        this.object.receiveShadow = true;
        this.object.castShadow = true;
        this.object.diceObject = this;
        this.object.body = new CANNON.Body({
            mass: this.mass,
            shape: this.object.geometry.cannon_shape,
            material: DiceManager.diceBodyMaterial
        });
        this.object.body.linearDamping = 0.1;
        this.object.body.angularDamping = 0.1;
        console.log('Adding dice body to physics world...');
        DiceManager.world.addBody(this.object.body);
        console.log('Dice object created successfully.');

        return this.object;
    }

    updateMeshFromBody(): void {
        if (!this.simulationRunning) {
            this.object.position.copy(this.object.body.position);
            this.object.quaternion.copy(this.object.body.quaternion);
        }
    }

    updateBodyFromMesh(): void {
        this.object.body.position.copy(this.object.position);
        this.object.body.quaternion.copy(this.object.quaternion);
    }

    resetBody(): void {
        this.object.body.vlambda = new CANNON.Vec3();
        this.object.body.position = new CANNON.Vec3();
        this.object.body.previousPosition = new CANNON.Vec3();
        this.object.body.initPosition = new CANNON.Vec3();
        this.object.body.velocity = new CANNON.Vec3();
        this.object.body.initVelocity = new CANNON.Vec3();
        this.object.body.force = new CANNON.Vec3();
        this.object.body.torque = new CANNON.Vec3();
        this.object.body.quaternion = new CANNON.Quaternion();
        this.object.body.initQuaternion = new CANNON.Quaternion();
        this.object.body.angularVelocity = new CANNON.Vec3();
        this.object.body.initAngularVelocity = new CANNON.Vec3();
        this.object.body.interpolatedPosition = new CANNON.Vec3();
        this.object.body.interpolatedQuaternion = new CANNON.Quaternion();
        this.object.body.inertia = new CANNON.Vec3();
        this.object.body.invInertia = new CANNON.Vec3();
        this.object.body.invInertiaWorld = new CANNON.Mat3();
        this.object.body.invInertiaSolve = new CANNON.Vec3();
        this.object.body.invInertiaWorldSolve = new CANNON.Mat3();
        this.object.body.wlambda = new CANNON.Vec3();

        this.object.body.updateMassProperties();
    }

    updateMaterialsForValue(diceValue: number): void {}
}