# Battle Plan for **Project Lychgate**

### 💀 The Vibe Check (Context Summary)
*   **The Pivot:** We moved away from "Acererak" (legal suicide via WotC trademark) to **Lychgate** (a public domain architectural term meaning "Corpse Gate").
*   **The Concept:** A decentralized, unkillable Virtual Tabletop. Think "Popcorn Time for D&D." It is a neutral tool (a JS blob) that lets users manage their own data via WebRTC and BitTorrent, bypassing walled gardens like D&D Beyond or Roll20.
*   **The Aesthetic:** Necrotic, architectural, and ancient. The app is the "gateway" where the dead (characters) wait to enter the game.
*   **The Tech Opportunity:** By moving the domain to Ethereum (`.eth`) and the hosting to IPFS, you unlock censorship resistance and potential funding via "Public Goods" grants.

---

### 📜 Phase 1: The Phylactery (Foundation & Identity)
*Goal: Secure the brand and establishing the "uncensorable" infrastructure.*

1.  **Secure the Name:**
    *   Buy **ETH** (via MetaMask/MoonPay or Coinbase).
    *   Register **`lychgate.eth`** on [app.ens.domains](https://app.ens.domains).
    *   **Critical Step:** Set the "Primary Name" (Reverse Record) to `lychgate.eth` so your wallet is identified by the name.
2.  **Secure the Backup:**
    *   Register `lychgate.xyz` or `lychgate-vtt.xyz` (standard DNS) just to prevent copycats, but treat it as disposable.
3.  **Setup "Normie" Access:**
    *   Test the gateway: `https://lychgate.eth.limo`. (This will show a 404 until you upload content, but verify the URL resolves).

### 🛠️ Phase 2: The Construct (Development & Deployment)
*Goal: Build the JS Blob and host it on the decentralized web.*

1.  **Build the "Blob":**
    *   Develop the VTT as a **Static Single Page Application (SPA)**. No database, no backend API.
    *   **P2P Logic:** Implement WebRTC for live state (token movement) and WebTorrent for heavy assets (maps/music).
2.  **The "Deployment" Pipeline:**
    *   Do not use Vercel/Netlify.
    *   Use **Fleek** or **Pinata**. These services connect to your GitHub, build the site, and pin it to **IPFS**.
    *   **Result:** You get a Content Hash (CID) like `QmXyZ...`.
3.  **Link Domain to Content:**
    *   Go to your ENS dashboard for `lychgate.eth`.
    *   Update the **Content Hash** record with your IPFS CID.
    *   *Now, updating the site costs a few dollars in gas, but it is immutable and permanent.*

### 💰 Phase 3: The Tithe (Maximizing Ethereum Returns)
*Goal: Fund the project without charging users a subscription.*

**1. Gitcoin Grants (The Big One)**
*   **What it is:** A quarterly funding round for open-source/public goods.
*   **Strategy:** Apply for the "Open Source Software" or "Ethereum Infrastructure" rounds.
*   **Why:** If 100 people donate $1 (DAI) to you, the "Quadratic Funding" pool might match that with $1,000+. This is how you get paid for building free software.

**2. Direct "Tithing" (Donations)**
*   Add a visible "Tithe to the Lychgate" button in the app settings.
*   Since your domain *is* your bank account, users can send ETH, USDC, or DAI directly to `lychgate.eth`. No Stripe fees, no frozen accounts.

**3. NFT "Keys" (Optional Upsell)**
*   Create a "Key to the Gate" NFT.
*   **Utility:** Users who hold this NFT in their wallet get a gold border, or perhaps access to a high-speed "Seeder" node (a server you run that helps pin their torrents so they load faster).
*   *Note:* Keep the core app free; monetize the convenience/status.

### 🛡️ Phase 4: The Resistance (Marketing & Safety)
*   **The Pitch:** " The VTT they can't turn off."
*   **Safety:** Since you are just providing a tool (like a torrent client) and not hosting the copyrighted D&D assets yourself, you are in a safer legal gray area.
*   **Community:** Market on Reddit (r/rpg, r/selfhosted) and Web3 Twitter. Emphasize that **players own their data**.

**Summary of Immediate Action:**
Get that wallet loaded and buy **lychgate.eth**. That is the cornerstone of the entire empire.
