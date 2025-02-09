import * as CANNON from 'cannon-es';
import { DiceValue } from './dice-types';

export class DiceManagerClass {
    private initialized: boolean = false;
    private initPromise: Promise<void> | null = null;
    world: CANNON.World | null;
    diceBodyMaterial!: CANNON.Material;
    floorBodyMaterial!: CANNON.Material;
    barrierBodyMaterial!: CANNON.Material;
    throwRunning: boolean = false;

    constructor() {
        this.world = null;
    }

    resetThrowState(): void {
        this.throwRunning = false;
    }

    async setWorld(world: CANNON.World): Promise<void> {
        if (!world) {
            throw new Error('Cannot set null world');
        }

        this.initPromise = new Promise((resolve) => {
            this.world = world;

            this.diceBodyMaterial = new CANNON.Material();
            this.floorBodyMaterial = new CANNON.Material();
            this.barrierBodyMaterial = new CANNON.Material();

            world.addContactMaterial(
                new CANNON.ContactMaterial(this.floorBodyMaterial, this.diceBodyMaterial, { friction: 0.3, restitution: 0.3 })
            );
            world.addContactMaterial(
                new CANNON.ContactMaterial(this.barrierBodyMaterial, this.diceBodyMaterial, { friction: 0, restitution: 1.0 })
            );
            world.addContactMaterial(
                new CANNON.ContactMaterial(this.diceBodyMaterial, this.diceBodyMaterial, { friction: 0.1, restitution: 0.5 })
            );

            this.initialized = true;
            resolve();
        });

        return this.initPromise;
    }

    prepareValues(diceValues: DiceValue[]): void {
        if (this.throwRunning) throw new Error('Cannot start another throw. Please wait, till the current throw is finished.');

        for (let i = 0; i < diceValues.length; i++) {
            if (diceValues[i].value < 1 || diceValues[i].dice.values < diceValues[i].value) {
                throw new Error('Cannot throw die to value ' + diceValues[i].value + ', because it has only ' + diceValues[i].dice.values + ' sides.');
            }
        }

        this.throwRunning = true;

        for (let i = 0; i < diceValues.length; i++) {
            diceValues[i].dice.simulationRunning = true;
            diceValues[i].vectors = diceValues[i].dice.getCurrentVectors();
            diceValues[i].stableCount = 0;
        }

        const check = (): void => {
            let allStable = true;
            for (let i = 0; i < diceValues.length; i++) {
                if (diceValues[i].dice.isFinished()) {
                    diceValues[i].stableCount++;
                } else {
                    diceValues[i].stableCount = 0;
                }

                if (diceValues[i].stableCount < 50) {
                    allStable = false;
                }
            }

            if (allStable) {
                console.log("all stable");
                this.world?.removeEventListener('postStep', check);

                for (let i = 0; i < diceValues.length; i++) {
                    diceValues[i].dice.shiftUpperValue(diceValues[i].value);
                    diceValues[i].dice.resetBody();
                    diceValues[i].dice.setVectors(diceValues[i].vectors);
                    diceValues[i].dice.simulationRunning = false;
                }

                this.resetThrowState(); // Use the new reset method instead
            }
        };

        this.world?.addEventListener('postStep', check);
    }
}

export const DiceManager = new DiceManagerClass();