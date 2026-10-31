# RoadGuard AI - 3-Minute Hackathon Demo Script

> **Theme:** Moving Road Safety from Reactive to Preventive  
> **Speaker Roles:** Lead Presenter (Full-Stack + ML)  
> **Target Audience:** Hackathon Jury, Municipal Road Authorities, Traffic Commissioners

---

## ⏱️ Minute 0:00 – 0:45: The Problem & Ethical Guardrails
- **Action:** Open browser at `http://localhost:5173`. Show the dark glassmorphic interface on the **Road Safety Officer Console**.
- **Script:**
  > *"Good morning, esteemed jury. Today, urban road safety in India is overwhelmingly reactive: we wait for crashes to occur before designating a blackspot. RoadGuard AI shifts this paradigm from reactive to **preventive**.*  
  > *Before showing the AI, observe our core guardrails: we do **zero identity surveillance**—no facial recognition, no license plates. Tracker IDs are temporary, used solely to compute close calls, and purged immediately. Furthermore, nothing reaches the field without **human approval**."*

---

## ⏱️ Minute 0:45 – 1:30: Observe, Explain & Recommend
- **Action:** Select **Silk Board Merge Junction (HS-01)** on the map. Point out:
  1. Risk score: `78.4` (High).
  2. TreeSHAP factors: Pedestrian-Vehicle Conflicts (+5.82), Excessive Merge Speed (+3.91).
  3. Evidence Panel: Click the camera clip reference and speed radar log showing 6 close calls and 56.4 km/h speed.
  4. Countermeasure card answering the 3 core questions:
     - **Why is it dangerous:** Vulnerable pedestrians crossing multi-lane merge with excessive approach speed.
     - **Recommended Fix:** 100mm raised tabletop zebra crossing with refuge island (IRC:99 standard).
     - **Verification Metric:** Pre vs post conflict rate drop from 11.4 to 4.1 per 1,000 crossings.
- **Script:**
  > *"Notice how the system doesn't just output a number. It answers three vital questions: why it's dangerous, what fix should be done, and how we know it worked. Every sentence is grounded in computed telemetry—our hallucination checker guarantees zero unsupported claims."*

---

## ⏱️ Minute 1:30 – 2:15: The Jury Surprise Scenario (Dynamic Adaptation)
- **Action:** Click the button: **`Test Jury Scenario (Rain + School + Closure)`** in the top bar.
- **Visual Feedback:**
  - Sliders smoothly move to: Rain 28 mm/h, Visibility 850m, Hour 15:00, School Bell Peak = ON, Road Closure = ON.
  - Latency counter flashes: `14.2 ms`.
  - Risk score surges to `88.5` (Critical).
  - Primary recommendation dynamically shifts to **`INT-005: Variable Speed Limit 20 km/h & Crossing Marshal Protocol`**.
- **Script:**
  > *"Now for the real test: what happens when compound chaos strikes? Let's trigger the jury surprise scenario: heavy monsoon rain (28 mm/h), low visibility, 3 PM school bell dispersal, and an upstream road closure.*  
  > *In **under 15 milliseconds**, our XGBoost and SHAP engine recomputes the risk vector without a single page reload. The system recognizes the vulnerable school zone surge and dynamically pivots the recommendation to an active 20 km/h speed limit and traffic warden protocol."*
- **Action:** Click **`Approve & Publish to Public`**. Confetti fires. Hotspot status switches to `APPROVED`.

---

## ⏱️ Minute 2:15 – 3:00: Zero-Knowledge Public Alerts & Work Orders
- **Action 1:** Switch to the **Traffic Police** tab. Show how police only see congestion layers and school zones—no damage lists, no private vehicles. Show accepting a signal split adjustment.
- **Action 2:** Switch to **Road Maintenance**. Show the RDD2022 damage queue (D40 pothole) and click **`Run Automated Re-Scan to Verify Repair`**. Confetti confirms post-repair verification.
- **Action 3:** Switch to **Public PWA Alerts**.
  - Show the Zero-Knowledge GPS banner.
  - Click **`Start Simulated Drive`**.
  - Watch the vehicle advance towards the junction.
  - When reaching within 300 meters: **Vibration triggers**, **audio speech synthesis announces warning**, and the **pulsing red HUD lights up**.
- **Script:**
  > *"Finally, when our newly approved hotspot is published, our Public PWA alerts approaching drivers. Notice the simulated drive: as the vehicle crosses the 300m boundary, the phone speaks the warning and vibrates—while sending **zero location bytes** to the server.*  
  > *From edge vision to explainable ML, human sign-off, municipal repair, and zero-knowledge citizen warnings—this is RoadGuard AI. Thank you."*
