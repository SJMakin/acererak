import * as THREE from 'three';
import { DiceObject } from './dice-object';
import { DiceOptions } from './dice-types';

export class DiceD4 extends DiceObject {
    d4FaceTexts: (string | number[])[][];

    constructor(options: DiceOptions) {
        super(options);

        this.tab = -0.1;
        this.af = Math.PI * 7 / 6;
        this.chamfer = 0.96;
        this.vertices = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
        this.faces = [[1, 0, 2, 1], [0, 1, 3, 2], [0, 3, 2, 3], [1, 2, 3, 4]];
        this.scaleFactor = 1.2;
        this.values = 4;
        this.d4FaceTexts = [
            [[], [0, 0, 0], [2, 4, 3], [1, 3, 4], [2, 1, 4], [1, 2, 3]],
            [[], [0, 0, 0], [2, 3, 4], [3, 1, 4], [2, 4, 1], [3, 2, 1]],
            [[], [0, 0, 0], [4, 3, 2], [3, 4, 1], [4, 2, 1], [3, 1, 2]],
            [[], [0, 0, 0], [4, 2, 3], [1, 4, 3], [4, 1, 2], [1, 3, 2]]
        ];
        this.faceTexts = this.d4FaceTexts[0];
        this.mass = 300;
        this.inertia = 5;
        this.invertUpside = true;

        this.customTextTextureFunction = (text: string | number[], color: string, backColor: string): THREE.Texture => {
            let canvas = document.createElement("canvas");
            let context = canvas.getContext("2d");
            let ts = this.calculateTextureSize(this.size / 2 + this.size * 2) * 2;
            canvas.width = canvas.height = ts;
            context.font = ts / 5 + "pt Arial";
            context.fillStyle = backColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = color;
            if (Array.isArray(text)) {
                for (let i in text) {
                    context.fillText(text[i].toString(), canvas.width / 2,
                        canvas.height / 2 - ts * 0.3);
                    context.translate(canvas.width / 2, canvas.height / 2);
                    context.rotate(Math.PI * 2 / 3);
                    context.translate(-canvas.width / 2, -canvas.height / 2);
                }
            }
            let texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            return texture;
        };

        this.create();
    }

    updateMaterialsForValue(diceValue: number): void {
        if (diceValue < 0) diceValue += 4;
        this.faceTexts = this.d4FaceTexts[diceValue];
        this.object.material = this.getMaterials();
    }
}

export class DiceD6 extends DiceObject {
    constructor(options: DiceOptions) {
        super(options);

        this.tab = 0.1;
        this.af = Math.PI / 4;
        this.chamfer = 0.96;
        this.vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
                        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
        this.faces = [[0, 3, 2, 1, 1], [1, 2, 6, 5, 2], [0, 1, 5, 4, 3],
                      [3, 7, 6, 2, 4], [0, 4, 7, 3, 5], [4, 5, 6, 7, 6]];
        this.scaleFactor = 0.9;
        this.values = 6;
        this.faceTexts = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8',
            '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
        this.textMargin = 1.0;
        this.mass = 300;
        this.inertia = 13;

        this.create();
    }
}

export class DiceD8 extends DiceObject {
    constructor(options: DiceOptions) {
        super(options);

        this.tab = 0;
        this.af = -Math.PI / 4 / 2;
        this.chamfer = 0.965;
        this.vertices = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
        this.faces = [[0, 2, 4, 1], [0, 4, 3, 2], [0, 3, 5, 3], [0, 5, 2, 4], [1, 3, 4, 5],
                      [1, 4, 2, 6], [1, 2, 5, 7], [1, 5, 3, 8]];
        this.scaleFactor = 1;
        this.values = 8;
        this.faceTexts = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8',
            '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
        this.textMargin = 1.2;
        this.mass = 340;
        this.inertia = 10;

        this.create();
    }
}

export class DiceD10 extends DiceObject {
    constructor(options: DiceOptions) {
        super(options);

        this.tab = 0;
        this.af = Math.PI * 6 / 5;
        this.chamfer = 0.945;
        this.vertices = [];
        this.faces = [[5, 7, 11, 0], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3], [7, 9, 11, 4],
                      [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7], [3, 5, 11, 8], [6, 4, 10, 9],
                      [1, 0, 2, -1], [1, 2, 3, -1], [3, 2, 4, -1], [3, 4, 5, -1], [5, 4, 6, -1],
                      [5, 6, 7, -1], [7, 6, 8, -1], [7, 8, 9, -1], [9, 8, 0, -1], [9, 0, 1, -1]];

        for (let i = 0, b = 0; i < 10; ++i, b += Math.PI * 2 / 10) {
            this.vertices.push([Math.cos(b), Math.sin(b), 0.105 * (i % 2 ? 1 : -1)]);
        }
        this.vertices.push([0, 0, -1]);
        this.vertices.push([0, 0, 1]);

        this.scaleFactor = 0.9;
        this.values = 10;
        this.faceTexts = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8',
            '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
        this.textMargin = 1.0;
        this.mass = 350;
        this.inertia = 9;

        this.create();
    }
}

export class DiceD12 extends DiceObject {
    constructor(options: DiceOptions) {
        super(options);

        let p = (1 + Math.sqrt(5)) / 2;
        let q = 1 / p;

        this.tab = 0.2;
        this.af = -Math.PI / 4 / 2;
        this.chamfer = 0.968;
        this.vertices = [[0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p], [p, 0, q],
                        [p, 0, -q], [-p, 0, q], [-p, 0, -q], [q, p, 0], [q, -p, 0], [-q, p, 0],
                        [-q, -p, 0], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1],
                        [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]];
        this.faces = [[2, 14, 4, 12, 0, 1], [15, 9, 11, 19, 3, 2], [16, 10, 17, 7, 6, 3], [6, 7, 19, 11, 18, 4],
                      [6, 18, 2, 0, 16, 5], [18, 11, 9, 14, 2, 6], [1, 17, 10, 8, 13, 7], [1, 13, 5, 15, 3, 8],
                      [13, 8, 12, 4, 5, 9], [5, 4, 14, 9, 15, 10], [0, 12, 8, 10, 16, 11], [3, 19, 7, 17, 1, 12]];
        this.scaleFactor = 0.9;
        this.values = 12;
        this.faceTexts = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8',
            '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
        this.textMargin = 1.0;
        this.mass = 350;
        this.inertia = 8;

        this.create();
    }
}

export class DiceD20 extends DiceObject {
    constructor(options: DiceOptions) {
        super(options);

        let t = (1 + Math.sqrt(5)) / 2;

        this.tab = -0.2;
        this.af = -Math.PI / 4 / 2;
        this.chamfer = 0.955;
        this.vertices = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
                        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
                        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
        this.faces = [[0, 11, 5, 1], [0, 5, 1, 2], [0, 1, 7, 3], [0, 7, 10, 4], [0, 10, 11, 5],
                      [1, 5, 9, 6], [5, 11, 4, 7], [11, 10, 2, 8], [10, 7, 6, 9], [7, 1, 8, 10],
                      [3, 9, 4, 11], [3, 4, 2, 12], [3, 2, 6, 13], [3, 6, 8, 14], [3, 8, 9, 15],
                      [4, 9, 5, 16], [2, 4, 11, 17], [6, 2, 10, 18], [8, 6, 7, 19], [9, 8, 1, 20]];
        this.scaleFactor = 1;
        this.values = 20;
        this.faceTexts = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8',
            '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
        this.textMargin = 1.0;
        this.mass = 400;
        this.inertia = 6;

        this.create();
    }
}