# Privacy Policy for Roll20 Emote Share

**Last Updated:** July 5, 2026

This privacy policy governs your use of the **Roll20 Emote Share** browser extension (the "Extension"). The Extension allows users to share and render floating emojis/emotes in real-time during Roll20 campaign sessions.

---

### 1. Information Collected and Transmitted

The Extension does not collect, harvest, or track any personally identifiable information (PII) or browser history. To facilitate real-time synchronization between players in the same campaign, the following data is transmitted and stored temporarily:

* **Emote Reaction**: The specific emoji character selected by the user (e.g. 🔥, 😂).
* **Speaker Name**: The text name currently selected in the Roll20 "Speaking As" dropdown (e.g. "Dragon Boss", "Sir Galahad").
* **Timestamp**: The date and time the emote was sent, to manage chronological floating order.
* **Campaign Name**: The title of the Roll20 campaign (extracted from the page title) used as a channel routing key so only players in the same campaign receive the emotes.

---

### 2. How Data is Used and Stored

* **Real-time Sync**: The transmitted data is sent to a Firebase Realtime Database (hosted by Google).
* **Multiplayer Routing**: The database matches players in the same campaign and broadcasts the emote to their active sessions.
* **No Analytics/Tracking**: This data is used solely for the active multiplayer gameplay experience and is never sold, analyzed, or used for tracking, telemetry, or marketing.

---

### 3. Third-Party Services

The Extension utilizes **Firebase Realtime Database** (a service provided by Google) to store and sync campaign emotes. Google's privacy policy can be viewed at: [Google Privacy & Terms](https://policies.google.com/privacy).

---

### 4. Data Retention

Data stored in the Realtime Database is transient. Since the database only needs to sync live events, old emotes are not permanently stored and may be overwritten or cleared periodically.

---

### 5. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this policy.

---

### 6. Contact Us

If you have any questions or feedback regarding this Privacy Policy, please contact the developer directly or open an issue on the project's repository.
