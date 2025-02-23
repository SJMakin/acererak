import { CombatState, Entity, CombatAction, RollResult } from '../types';
import { performRoll } from './diceService';

export class CombatSystem {
  private state: CombatState;

  constructor(participants: Entity[]) {
    this.state = {
      active: true,
      participants,
      initiative: [],
      currentTurn: 0,
      round: 1,
      log: [],
    };
  }

  async initiateCombat(): Promise<void> {
    // Roll initiative for all participants
    const initiativeRolls = await Promise.all(
      this.state.participants.map(async (entity) => {
        const roll = performRoll({ type: 'd20', count: 1, description: 'Initiative roll' });
        return {
          entity,
          score: roll.total,
        };
      })
    );

    // Sort by initiative score, highest first
    this.state.initiative = initiativeRolls.sort((a, b) => b.score - a.score);
  }

  getCurrentTurn(): { entity: Entity; turnNumber: number } {
    return {
      entity: this.state.initiative[this.state.currentTurn].entity,
      turnNumber: this.state.currentTurn + 1,
    };
  }

  async executeAction(action: Omit<CombatAction, 'roll'>): Promise<CombatAction> {
    let roll: RollResult;

    switch (action.type) {
      case 'attack':
        roll = performRoll({ type: 'd20', count: 1, description: 'Attack roll' });
        break;
      case 'spell':
        roll = performRoll({ type: 'd20', count: 1, description: 'Spell attack roll' });
        break;
      case 'ability':
        roll = performRoll({ type: 'd20', count: 1, description: 'Ability check' });
        break;
      default:
        roll = performRoll({ type: 'd20', count: 1, description: 'Action roll' });
    }

    const completedAction: CombatAction = {
      ...action,
      roll,
    };

    this.state.log.push(completedAction);
    return completedAction;
  }

  nextTurn(): void {
    this.state.currentTurn = (this.state.currentTurn + 1) % this.state.participants.length;
    if (this.state.currentTurn === 0) {
      this.state.round++;
    }
  }

  getCombatState(): CombatState {
    return { ...this.state };
  }

  isCombatActive(): boolean {
    return this.state.active;
  }

  endCombat(): void {
    this.state.active = false;
  }

  // Helper method to check if all enemies are defeated
  checkCombatEnd(): boolean {
    const enemies = this.state.participants.filter(p => p.type === 'enemy');
    const allEnemiesDefeated = enemies.every(enemy => {
      const hpLine = enemy.sheet.match(/HP: (\d+)\/\d+/);
      return hpLine && parseInt(hpLine[1]) <= 0;
    });

    if (allEnemiesDefeated) {
      this.endCombat();
      return true;
    }
    return false;
  }

  // Helper to parse HP from entity sheet
  static getEntityHP(entity: Entity): { current: number; max: number } | null {
    const hpMatch = entity.sheet.match(/HP: (\d+)\/(\d+)/);
    if (hpMatch) {
      return {
        current: parseInt(hpMatch[1]),
        max: parseInt(hpMatch[2]),
      };
    }
    return null;
  }

  // Helper to update HP in entity sheet
  static updateEntityHP(entity: Entity, newHP: number): Entity {
    const updatedSheet = entity.sheet.replace(
      /HP: \d+\/(\d+)/,
      `HP: ${Math.max(0, newHP)}/$1`
    );
    return {
      ...entity,
      sheet: updatedSheet,
    };
  }
}
