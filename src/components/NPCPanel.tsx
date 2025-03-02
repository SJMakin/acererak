import React from 'react';

const NPCPanel: React.FC = () => {
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
        NPCs
      </h2>
      
      <p style={{ marginBottom: '20px' }}>
        This panel will contain NPCs that are relevant to your adventure. 
        You can add NPCs here to keep track of important characters you encounter.
      </p>
      
      <div style={{ 
        backgroundColor: '#252525', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #333'
      }}>
        <h3 style={{ color: '#9fa8da', marginBottom: '10px' }}>Sample NPC: Tavern Keeper</h3>
        <p><strong>Name:</strong> Gundren Rockseeker</p>
        <p><strong>Race:</strong> Dwarf</p>
        <p><strong>Occupation:</strong> Tavern Owner</p>
        <p><strong>Personality:</strong> Gruff but fair, knows all the local gossip</p>
        <p><strong>Notes:</strong> Has a mysterious scar on his right hand that he refuses to talk about.</p>
      </div>
      
      <div style={{ 
        backgroundColor: '#252525', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #333'
      }}>
        <h3 style={{ color: '#9fa8da', marginBottom: '10px' }}>Sample NPC: Town Guard</h3>
        <p><strong>Name:</strong> Sildar Hallwinter</p>
        <p><strong>Race:</strong> Human</p>
        <p><strong>Occupation:</strong> Town Guard Captain</p>
        <p><strong>Personality:</strong> Dutiful and honorable, takes his job very seriously</p>
        <p><strong>Notes:</strong> Former adventurer who settled down after an injury. Has connections to the local nobility.</p>
      </div>
    </div>
  );
};

export default NPCPanel;
