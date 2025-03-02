import React from 'react';

const RulesPanel: React.FC = () => {
  return (
    <div style={{
      height: '100%',
      padding: '20px',
      backgroundColor: '#1e1e1e',
      color: '#e0e0e0',
      overflow: 'auto'
    }}>
      <h2 style={{ 
        marginBottom: '20px', 
        color: '#9fa8da',
        borderBottom: '1px solid #333',
        paddingBottom: '10px'
      }}>
        Custom Rules
      </h2>
      
      <p style={{ marginBottom: '20px' }}>
        This panel contains custom rules and house rules for your campaign.
        These rules will be incorporated into the AI story generation.
      </p>
      
      <div style={{ 
        backgroundColor: '#252525', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #333'
      }}>
        <h3 style={{ color: '#9fa8da', marginBottom: '10px' }}>Critical Hits</h3>
        <p>On a natural 20, the player rolls damage dice twice and adds modifiers once.</p>
        <p>Additionally, the player can choose one of the following effects:</p>
        <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
          <li>Disarm the opponent</li>
          <li>Knock the opponent prone</li>
          <li>Deal additional bleeding damage (1d4 per round for 3 rounds)</li>
        </ul>
      </div>
      
      <div style={{ 
        backgroundColor: '#252525', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #333'
      }}>
        <h3 style={{ color: '#9fa8da', marginBottom: '10px' }}>Resting</h3>
        <p>Short rests take 30 minutes instead of 1 hour.</p>
        <p>During a long rest, characters regain all hit points and half of their spent Hit Dice.</p>
      </div>
      
      <div style={{ 
        backgroundColor: '#252525', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #333'
      }}>
        <h3 style={{ color: '#9fa8da', marginBottom: '10px' }}>Magic Items</h3>
        <p>Players can attune to 4 magic items instead of the standard 3.</p>
        <p>Identifying a magic item requires a short rest and a successful Arcana check (DC 15).</p>
      </div>
    </div>
  );
};

export default RulesPanel;
