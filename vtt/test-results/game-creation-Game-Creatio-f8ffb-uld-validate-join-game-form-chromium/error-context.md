# Page snapshot

```yaml
- generic [ref=e4]:
  - heading "🎲 Acererak VTT" [level=1] [ref=e5]
  - paragraph [ref=e6]: Decentralized Virtual Tabletop for TTRPG
  - generic [ref=e7]:
    - tablist [ref=e8]:
      - tab "Recent Games" [ref=e9] [cursor=pointer]:
        - generic [ref=e10]: Recent Games
      - tab "Create Game" [ref=e11] [cursor=pointer]:
        - generic [ref=e12]: Create Game
      - tab "Join Game" [selected] [ref=e13] [cursor=pointer]:
        - generic [ref=e14]: Join Game
    - tabpanel "Join Game" [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: Room ID *
          - textbox "Room ID" [active] [ref=e20]:
            - /placeholder: Enter room ID or scan QR
        - generic [ref=e21]:
          - generic [ref=e22]: Your Name *
          - textbox "Your Name" [ref=e24]:
            - /placeholder: Player Name
        - generic [ref=e25]:
          - generic [ref=e26]: Your Color
          - generic [ref=e27]:
            - textbox "Your Color" [ref=e34]: "#3b82f6"
            - button [ref=e36] [cursor=pointer]:
              - img [ref=e38]
        - button "Join Game" [disabled] [ref=e42]:
          - generic [ref=e44]: Join Game
```