import { CombatState, Entity, CombatAction, RollResult, DiceRoll } from '../types';
import { performRoll } from './diceService';

// Helper function to extract entity name from markdown sheet
export function getEntityName(entity: Entity): string {
  // Look for a name in the markdown sheet
  const nameMatch = entity.sheet.match(/Name: ([^\n]+)/);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1].trim();
  }
  
  // Fallback to entity ID if name not found
  return entity.id;
}

// Helper function to extract entity actions from markdown sheet
export function getEntityActions(entity: Entity): Array<{name: string, details: string, type: CombatAction['type']}> {
  const actions: Array<{name: string, details: string, type: CombatAction['type']}> = [];
  
  // For enemies, look for actions/attacks section in the markdown
  if (entity.type === 'enemy') {
    const actionSectionMatch = entity.sheet.match(/## (Actions|Attacks|Special Abilities)\n([\s\S]*?)(?=\n##|$)/g);
    
    if (actionSectionMatch) {
      // Process each action section found
      actionSectionMatch.forEach(section => {
        // Extract individual action lines
        const actionLines = section.match(/- ([^:]+): (.*?)(?=\n-|\n\n|$)/g);
        
        if (!actionLines) {
          return;
        }
        
        // Process each action line
        actionLines.forEach(line => {
          const actionMatch = line.match(/- ([^:]+): (.*)/);
          if (actionMatch) {
            const name = actionMatch[1].trim();
            const details = actionMatch[2].trim();
            
            // Determine action type based on details
            let type: CombatAction['type'] = 'attack';
            if (details.toLowerCase().includes('spell') || details.toLowerCase().includes('magic')) {
              type = 'spell';
            } else if (details.toLowerCase().includes('ability') || details.toLowerCase().includes('special')) {
              type = 'ability';
            } else if (details.toLowerCase().includes('item') || details.toLowerCase().includes('potion')) {
              type = 'item';
            }
            
            actions.push({ name, details, type });
          }
        });
      });
    }
  } 
  
  // For player characters, look for actions in the Actions section, class features, abilities, equipment, etc.
  if (entity.type === 'player') {
    // First, try to find the dedicated Actions section
    const actionSectionMatch = entity.sheet.match(/## Actions\n([\s\S]*?)(?=\n##|$)/g);
    
    if (actionSectionMatch) {
      // Process the Actions section
      actionSectionMatch.forEach(section => {
        // Extract individual action lines
        const actionLines = section.match(/- ([^:]+): (.*?)(?=\n-|\n\n|$)/g);
        
        if (actionLines) {
          // Process each action line
          actionLines.forEach(line => {
            const actionMatch = line.match(/- ([^:]+): (.*)/);
            if (actionMatch) {
              const name = actionMatch[1].trim();
              const details = actionMatch[2].trim();
              
              // Determine action type based on details
              let type: CombatAction['type'] = 'attack';
              if (details.toLowerCase().includes('spell') || details.toLowerCase().includes('magic')) {
                type = 'spell';
              } else if (details.toLowerCase().includes('ability') || details.toLowerCase().includes('special')) {
                type = 'ability';
              } else if (details.toLowerCase().includes('item') || details.toLowerCase().includes('potion')) {
                type = 'item';
              }
              
              actions.push({ name, details, type });
            }
          });
        }
      });
    }
    
    // If no actions found in the Actions section, look in other sections
    if (actions.length === 0) {
      // Try to find class features, abilities, equipment sections
      const featureSections = [
        /## (Class Features|Abilities & Features)\n([\s\S]*?)(?=\n##|$)/g,
        /## Equipment\n([\s\S]*?)(?=\n##|$)/g,
        /## (Racial Traits|Feats)\n([\s\S]*?)(?=\n##|$)/g
      ];
    
      // Check each section type
      featureSections.forEach(sectionRegex => {
        const sectionMatch = entity.sheet.match(sectionRegex);
        
        if (sectionMatch) {
          sectionMatch.forEach(section => {
            // Look for items that could be actions
            const itemLines = section.match(/- ([^:\n]+)(?:: ([^\n]+))?/g);
            
            if (itemLines) {
              itemLines.forEach(line => {
                const itemMatch = line.match(/- ([^:\n]+)(?:: ([^\n]+))?/);
                if (itemMatch) {
                  const name = itemMatch[1].trim();
                  const details = itemMatch[2] ? itemMatch[2].trim() : '';
                  
                  // Skip items that are clearly not actions
                  if (name.includes('Coins') || 
                      name.includes('gold') || 
                      name.includes('None') ||
                      name.includes('Character created')) {
                    return;
                  }
                  
                  // Determine action type based on name and details
                  let type: CombatAction['type'] = 'attack';
                  
                  if (name.toLowerCase().includes('spell') || 
                      name.toLowerCase().includes('magic') ||
                      details.toLowerCase().includes('spell') ||
                      details.toLowerCase().includes('magic')) {
                    type = 'spell';
                  } else if (name.toLowerCase().includes('ability') || 
                             details.toLowerCase().includes('ability') ||
                             name.toLowerCase().includes('feature')) {
                    type = 'ability';
                  } else if (name.toLowerCase().includes('potion') || 
                             name.toLowerCase().includes('scroll') ||
                             details.toLowerCase().includes('item')) {
                    type = 'item';
                  } else if (name.toLowerCase().includes('sword') || 
                             name.toLowerCase().includes('axe') ||
                             name.toLowerCase().includes('bow') ||
                             name.toLowerCase().includes('dagger') ||
                             name.toLowerCase().includes('mace')) {
                    type = 'attack';
                  }
                  
                  // Add action with appropriate details
                  actions.push({ 
                    name, 
                    details: details || `Use ${name}`, 
                    type 
                  });
                }
              });
            }
          });
        }
      });
    }
    
    // If no actions were found, add default actions based on class
    if (actions.length === 0) {
      // Try to determine class
      const classMatch = entity.sheet.match(/Class: ([^\n]+)/);
      const className = classMatch ? classMatch[1].trim().toLowerCase() : '';
      
      // Add default actions based on class
      if (className.includes('wizard') || className.includes('sorcerer') || className.includes('warlock')) {
        actions.push(
          { name: 'Magic Missile', details: 'Cast Magic Missile spell (1d4+1 force damage)', type: 'spell' },
          { name: 'Fire Bolt', details: 'Cast Fire Bolt cantrip (1d10 fire damage)', type: 'spell' },
          { name: 'Staff Strike', details: 'Hit with quarterstaff (1d6 bludgeoning damage)', type: 'attack' }
        );
      } else if (className.includes('fighter') || className.includes('barbarian') || className.includes('paladin')) {
        actions.push(
          { name: 'Sword Slash', details: 'Attack with sword (1d8+2 slashing damage)', type: 'attack' },
          { name: 'Shield Bash', details: 'Bash with shield (1d4+2 bludgeoning damage)', type: 'attack' },
          { name: 'Second Wind', details: 'Regain 1d10+1 hit points', type: 'ability' }
        );
      } else if (className.includes('rogue')) {
        actions.push(
          { name: 'Sneak Attack', details: 'Attack with advantage (1d8+1d6+2 piercing damage)', type: 'attack' },
          { name: 'Dagger Throw', details: 'Throw dagger (1d4+2 piercing damage)', type: 'attack' },
          { name: 'Cunning Action', details: 'Bonus action to Dash, Disengage, or Hide', type: 'ability' }
        );
      } else if (className.includes('cleric') || className.includes('druid')) {
        actions.push(
          { name: 'Mace Strike', details: 'Hit with mace (1d6+1 bludgeoning damage)', type: 'attack' },
          { name: 'Healing Word', details: 'Cast Healing Word spell (1d4+3 healing)', type: 'spell' },
          { name: 'Sacred Flame', details: 'Cast Sacred Flame cantrip (1d8 radiant damage)', type: 'spell' }
        );
      } else {
        // Generic actions for any class
        actions.push(
          { name: 'Basic Attack', details: 'Attack with weapon (1d8 damage)', type: 'attack' },
          { name: 'Dodge', details: 'Take the Dodge action', type: 'ability' },
          { name: 'Use Item', details: 'Use an item from inventory', type: 'item' }
        );
      }
    }
  }
  
  return actions;
}

// Helper function to extract damage dice from action details
export function extractDamageRoll(actionDetails: string): DiceRoll | null {
  // Look for dice notation like "2d6" or "1d8+2"
  const diceMatch = actionDetails.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  
  if (diceMatch) {
    const count = parseInt(diceMatch[1]);
    const sides = parseInt(diceMatch[2]);
    const modifier = diceMatch[3] ? parseInt(diceMatch[3]) : undefined;
    
    // Map sides to dice type
    let type: DiceRoll['type'] = 'd20';
    if (sides === 4) type = 'd4';
    else if (sides === 6) type = 'd6';
    else if (sides === 8) type = 'd8';
    else if (sides === 10) type = 'd10';
    else if (sides === 12) type = 'd12';
    else if (sides === 20) type = 'd20';
    else if (sides === 100) type = 'd100';
    
    return {
      type,
      count,
      modifier,
      description: 'Damage roll'
    };
  }
  
  return null;
}

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
    // Get entity actions to find the specific action being used
    const actorName = getEntityName(action.actor);
    const entityActions = getEntityActions(action.actor);
    const targetName = getEntityName(action.target);
    
    // Find the specific action if it has a name
    const actionName = action.description.split(' ')[2]; // Extract action name from description
    const entityAction = entityActions.find(a => a.name.toLowerCase() === actionName?.toLowerCase());
    
    // Determine roll type and description based on action
    let rollType: DiceRoll['type'] = 'd20';
    let rollCount = 1;
    let rollDescription = `${action.type} roll`;
    
    if (entityAction) {
      // Use the action type from the entity's action list
      action.type = entityAction.type;
      rollDescription = `${actorName}'s ${entityAction.name}`;
      
      // Check if we can extract damage dice information
      const damageRoll = extractDamageRoll(entityAction.details);
      if (damageRoll) {
        rollType = damageRoll.type;
        rollCount = damageRoll.count;
      }
    } else {
      // Default roll description if no specific action found
      rollDescription = `${actorName}'s ${action.type} against ${targetName}`;
    }
    
    // Perform the roll
    const roll = performRoll({ 
      type: rollType, 
      count: rollCount, 
      description: rollDescription 
    });

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
