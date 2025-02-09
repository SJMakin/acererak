import { DiceManager } from './dice-manager';
import { DiceD4, DiceD6, DiceD8, DiceD10, DiceD12, DiceD20 } from './dice-types-impl';

export {
    DiceManager,
    DiceD4,
    DiceD6,
    DiceD8,
    DiceD10,
    DiceD12,
    DiceD20
};

// Make dice available globally for debugging
(window as any).Dice = {
    DiceManager,
    DiceD4,
    DiceD6,
    DiceD8,
    DiceD10,
    DiceD12,
    DiceD20,
};